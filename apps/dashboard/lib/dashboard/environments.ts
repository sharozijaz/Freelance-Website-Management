import { and, eq } from "drizzle-orm";
import {
  generateEnvironmentAccessSecret,
  hashEnvironmentAccessSecret,
} from "@agency/auth/environment-access";
import type { createDatabaseClient } from "@agency/database";
import { auditLogs, deployments, websiteEnvironments } from "@agency/database/schema";
import { requireWebsiteAccess } from "./projects";
import type { DashboardRequest } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

export const websiteEnvironmentTypes = ["staging", "production"] as const;
export type WebsiteEnvironmentType = (typeof websiteEnvironmentTypes)[number];
export type WebsiteEnvironmentStatus = "active" | "inactive";

export class WebsiteEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebsiteEnvironmentError";
  }
}

export interface WebsiteEnvironmentListItem {
  baseUrl: string | null;
  createdAt: Date;
  id: string;
  lastDeployment: {
    completedAt: Date | null;
    deploymentUrl: string | null;
    id: string;
    provider: string;
    status: string;
  } | null;
  name: string;
  previewAccessConfigured: boolean;
  previewAccessTokenRotatedAt: Date | null;
  stagingAccessEnabled: boolean;
  stagingAccessSecretConfigured: boolean;
  stagingAccessSecretRotatedAt: Date | null;
  status: WebsiteEnvironmentStatus;
  type: WebsiteEnvironmentType;
  updatedAt: Date;
}

function normalizeBaseUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new WebsiteEnvironmentError("Base URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new WebsiteEnvironmentError("Base URL must use HTTP or HTTPS.");
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (name.length < 2) {
    throw new WebsiteEnvironmentError("Environment name must be at least 2 characters.");
  }
  if (name.length > 80) {
    throw new WebsiteEnvironmentError("Environment name must be 80 characters or fewer.");
  }

  return name;
}

function normalizeStatus(value: string): WebsiteEnvironmentStatus {
  if (value === "active" || value === "inactive") {
    return value;
  }

  throw new WebsiteEnvironmentError("Environment status is not supported.");
}

async function createMissingDefaultEnvironments({
  database,
  website,
}: {
  database: Database;
  website: {
    id: string;
    organizationId: string;
    previewUrl: string | null;
    productionUrl: string | null;
    websiteType: string;
  };
}) {
  if (website.websiteType !== "sharoz_connected") {
    return;
  }

  for (const type of websiteEnvironmentTypes) {
    const existing = await database.query.websiteEnvironments.findFirst({
      where: and(eq(websiteEnvironments.websiteId, website.id), eq(websiteEnvironments.type, type)),
      columns: { id: true },
    });

    if (existing) {
      continue;
    }

    await database.insert(websiteEnvironments).values({
      baseUrl: type === "staging" ? website.previewUrl : website.productionUrl,
      name: type === "staging" ? "Staging" : "Production",
      organizationId: website.organizationId,
      status: "active",
      type,
      websiteId: website.id,
    });
  }
}

export async function listWebsiteEnvironments({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "websites:read",
    request,
    websiteId,
  });

  await createMissingDefaultEnvironments({ database, website });

  const rows = await database.query.websiteEnvironments.findMany({
    where: and(
      eq(websiteEnvironments.organizationId, website.organizationId),
      eq(websiteEnvironments.websiteId, website.id),
    ),
    orderBy: (table, { asc }) => [asc(table.type)],
  });

  const deploymentRows = await database.query.deployments.findMany({
    where: and(
      eq(deployments.organizationId, website.organizationId),
      eq(deployments.websiteId, website.id),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return {
    environments: rows.map((environment) => {
      const lastDeployment =
        deploymentRows.find((deployment) => deployment.websiteEnvironmentId === environment.id) ??
        null;

      return {
        baseUrl: environment.baseUrl,
        createdAt: environment.createdAt,
        id: environment.id,
        lastDeployment: lastDeployment
          ? {
              completedAt: lastDeployment.completedAt,
              deploymentUrl: lastDeployment.deploymentUrl,
              id: lastDeployment.id,
              provider: lastDeployment.provider,
              status: lastDeployment.status,
            }
          : null,
        name: environment.name,
        previewAccessConfigured: Boolean(environment.previewAccessTokenHash),
        previewAccessTokenRotatedAt: environment.previewAccessTokenRotatedAt,
        stagingAccessEnabled: environment.stagingAccessEnabled,
        stagingAccessSecretConfigured: Boolean(environment.stagingAccessSecretHash),
        stagingAccessSecretRotatedAt: environment.stagingAccessSecretRotatedAt,
        status: environment.status,
        type: environment.type,
        updatedAt: environment.updatedAt,
      } satisfies WebsiteEnvironmentListItem;
    }),
    website,
  };
}

export async function updateWebsiteEnvironment({
  database,
  environmentId,
  input,
  request,
  websiteId,
}: {
  database: Database;
  environmentId: string;
  input: {
    baseUrl?: string | null;
    name?: string | null;
    status?: string | null;
  };
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "websites:manage",
    request,
    websiteId,
  });

  const environment = await database.query.websiteEnvironments.findFirst({
    where: and(
      eq(websiteEnvironments.id, environmentId),
      eq(websiteEnvironments.organizationId, website.organizationId),
      eq(websiteEnvironments.websiteId, website.id),
    ),
  });

  if (!environment) {
    throw new WebsiteEnvironmentError("Environment was not found.");
  }

  const name = input.name === undefined ? environment.name : normalizeName(input.name ?? "");
  const baseUrl =
    input.baseUrl === undefined ? environment.baseUrl : normalizeBaseUrl(input.baseUrl);
  const status =
    input.status === undefined ? environment.status : normalizeStatus(input.status ?? "");
  const now = new Date();

  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(websiteEnvironments)
      .set({ baseUrl, name, status, updatedAt: now })
      .where(eq(websiteEnvironments.id, environment.id))
      .returning();

    if (!row) {
      throw new WebsiteEnvironmentError("Environment could not be updated.");
    }

    await tx.insert(auditLogs).values({
      action: "website_environment.updated",
      actorUserId: request.context.user.id,
      metadata: {
        environmentId: environment.id,
        environmentType: environment.type,
        websiteId: website.id,
      },
      organizationId: website.organizationId,
      resourceId: environment.id,
      resourceType: "website_environment",
    });

    return [row];
  });

  return updated;
}

export async function rotatePreviewAccessToken({
  database,
  environmentId,
  request,
  websiteId,
}: {
  database: Database;
  environmentId: string;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "websites:manage",
    request,
    websiteId,
  });

  const environment = await database.query.websiteEnvironments.findFirst({
    where: and(
      eq(websiteEnvironments.id, environmentId),
      eq(websiteEnvironments.organizationId, website.organizationId),
      eq(websiteEnvironments.websiteId, website.id),
    ),
  });

  if (!environment) {
    throw new WebsiteEnvironmentError("Environment was not found.");
  }

  if (environment.type !== "staging") {
    throw new WebsiteEnvironmentError("Preview access tokens are only supported for staging.");
  }

  const token = generateEnvironmentAccessSecret();
  const now = new Date();

  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(websiteEnvironments)
      .set({
        previewAccessTokenHash: hashEnvironmentAccessSecret(token),
        previewAccessTokenRotatedAt: now,
        updatedAt: now,
      })
      .where(eq(websiteEnvironments.id, environment.id))
      .returning();

    if (!row) {
      throw new WebsiteEnvironmentError("Preview access token could not be rotated.");
    }

    await tx.insert(auditLogs).values({
      action: "website_environment.preview_access_rotated",
      actorUserId: request.context.user.id,
      metadata: {
        environmentId: environment.id,
        environmentType: environment.type,
        websiteId: website.id,
      },
      organizationId: website.organizationId,
      resourceId: environment.id,
      resourceType: "website_environment",
    });

    return [row];
  });

  return { environment: updated, token };
}

export async function updateStagingAccessProtection({
  database,
  enabled,
  environmentId,
  request,
  rotateSecret = false,
  websiteId,
}: {
  database: Database;
  enabled: boolean;
  environmentId: string;
  request: DashboardRequest;
  rotateSecret?: boolean;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "websites:manage",
    request,
    websiteId,
  });

  const environment = await database.query.websiteEnvironments.findFirst({
    where: and(
      eq(websiteEnvironments.id, environmentId),
      eq(websiteEnvironments.organizationId, website.organizationId),
      eq(websiteEnvironments.websiteId, website.id),
    ),
  });

  if (!environment) {
    throw new WebsiteEnvironmentError("Environment was not found.");
  }

  if (environment.type !== "staging") {
    throw new WebsiteEnvironmentError("Staging access protection is only supported for staging.");
  }

  const token =
    enabled && (rotateSecret || !environment.stagingAccessSecretHash)
      ? generateEnvironmentAccessSecret()
      : null;
  const now = new Date();
  const action = enabled
    ? rotateSecret && environment.stagingAccessEnabled
      ? "website_environment.staging_secret_rotated"
      : "website_environment.staging_access_enabled"
    : "website_environment.staging_access_disabled";

  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(websiteEnvironments)
      .set({
        stagingAccessEnabled: enabled,
        stagingAccessSecretHash: token
          ? hashEnvironmentAccessSecret(token)
          : environment.stagingAccessSecretHash,
        stagingAccessSecretRotatedAt: token ? now : environment.stagingAccessSecretRotatedAt,
        updatedAt: now,
      })
      .where(eq(websiteEnvironments.id, environment.id))
      .returning();

    if (!row) {
      throw new WebsiteEnvironmentError("Staging access protection could not be updated.");
    }

    await tx.insert(auditLogs).values({
      action,
      actorUserId: request.context.user.id,
      metadata: {
        enabled,
        environmentId: environment.id,
        environmentType: environment.type,
        rotatedSecret: Boolean(token),
        websiteId: website.id,
      },
      organizationId: website.organizationId,
      resourceId: environment.id,
      resourceType: "website_environment",
    });

    return [row];
  });

  return { environment: updated, token };
}
