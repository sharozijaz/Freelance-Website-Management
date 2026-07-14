import { and, eq } from "drizzle-orm";
import {
  createWebsiteCredentialPair,
  hashWebsiteCredentialSecret,
} from "@agency/auth/website-credentials";
import type { createDatabaseClient } from "@agency/database";
import { auditLogs, websiteApiCredentials, websiteEnvironments } from "@agency/database/schema";
import { requireWebsiteAccess } from "./projects";
import type { DashboardRequest } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

export class WebsiteCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebsiteCredentialError";
  }
}

export interface WebsiteCredentialListItem {
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  label: string;
  lastUsedAt: Date | null;
  publicKey: string;
  revokedAt: Date | null;
  status: "active" | "revoked";
  updatedAt: Date;
  environment: {
    id: string;
    name: string;
    type: "production" | "staging";
  };
}

export interface WebsiteCredentialCreationResult {
  credential: WebsiteCredentialListItem;
  secret: string;
}

function assertSharozConnectedWebsite(website: { websiteType: string }) {
  if (website.websiteType !== "sharoz_connected") {
    throw new WebsiteCredentialError(
      "Website credentials can only be created for Sharoz Connected websites.",
    );
  }
}

function normalizeLabel(value: string): string {
  const label = value.trim();
  if (label.length < 2) {
    throw new WebsiteCredentialError("Credential label must be at least 2 characters.");
  }

  if (label.length > 80) {
    throw new WebsiteCredentialError("Credential label must be 80 characters or fewer.");
  }

  return label;
}

function normalizeExpiration(value?: Date | null): Date | null {
  if (!value) {
    return null;
  }

  if (Number.isNaN(value.getTime())) {
    throw new WebsiteCredentialError("Credential expiration must be a valid date.");
  }

  if (value <= new Date()) {
    throw new WebsiteCredentialError("Credential expiration must be in the future.");
  }

  return value;
}

function toListItem(
  row: typeof websiteApiCredentials.$inferSelect & {
    environment: Pick<typeof websiteEnvironments.$inferSelect, "id" | "name" | "type">;
  },
): WebsiteCredentialListItem {
  return {
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    id: row.id,
    label: row.label,
    lastUsedAt: row.lastUsedAt,
    publicKey: row.publicKey,
    revokedAt: row.revokedAt,
    status: row.status,
    updatedAt: row.updatedAt,
    environment: {
      id: row.environment.id,
      name: row.environment.name,
      type: row.environment.type,
    },
  };
}

async function writeCredentialAudit({
  action,
  credential,
  database,
  environment,
  organizationId,
  request,
  websiteId,
}: {
  action:
    "website_credential.created" | "website_credential.rotated" | "website_credential.revoked";
  credential: Pick<typeof websiteApiCredentials.$inferSelect, "id" | "label" | "publicKey">;
  database: Database;
  organizationId: string;
  request: DashboardRequest;
  websiteId: string;
  environment: Pick<typeof websiteEnvironments.$inferSelect, "id" | "type">;
}) {
  await database.insert(auditLogs).values({
    action,
    actorUserId: request.context.user.id,
    metadata: {
      credentialId: credential.id,
      credentialLabel: credential.label,
      environmentId: environment.id,
      environmentType: environment.type,
      publicKey: credential.publicKey,
      websiteId,
    },
    organizationId,
    resourceId: websiteId,
    resourceType: "website",
  });
}

export async function listWebsiteCredentials({
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
    permission: "developer:credentials",
    request,
    websiteId,
  });

  const credentials = await database.query.websiteApiCredentials.findMany({
    where: and(
      eq(websiteApiCredentials.organizationId, website.organizationId),
      eq(websiteApiCredentials.websiteId, website.id),
    ),
    with: { environment: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  const environments = await database.query.websiteEnvironments.findMany({
    where: and(
      eq(websiteEnvironments.organizationId, website.organizationId),
      eq(websiteEnvironments.websiteId, website.id),
    ),
    orderBy: (table, { asc }) => [asc(table.type)],
  });

  return {
    credentials: credentials.map(toListItem),
    environments: environments.map((environment) => ({
      id: environment.id,
      name: environment.name,
      status: environment.status,
      type: environment.type,
    })),
    websiteType: website.websiteType,
  };
}

export async function createWebsiteCredential({
  database,
  input,
  request,
  websiteId,
}: {
  database: Database;
  input: {
    expiresAt?: Date | null;
    environmentId: string;
    label: string;
  };
  request: DashboardRequest;
  websiteId: string;
}): Promise<WebsiteCredentialCreationResult> {
  const website = await requireWebsiteAccess({
    database,
    permission: "developer:credentials",
    request,
    websiteId,
  });
  assertSharozConnectedWebsite(website);

  const label = normalizeLabel(input.label);
  const expiresAt = normalizeExpiration(input.expiresAt);
  const environment = await database.query.websiteEnvironments.findFirst({
    where: and(
      eq(websiteEnvironments.id, input.environmentId),
      eq(websiteEnvironments.organizationId, website.organizationId),
      eq(websiteEnvironments.websiteId, website.id),
    ),
  });

  if (!environment) {
    throw new WebsiteCredentialError("Credential environment was not found.");
  }

  if (environment.status !== "active") {
    throw new WebsiteCredentialError("Credentials can only be created for active environments.");
  }

  const pair = createWebsiteCredentialPair();
  const now = new Date();
  const [credential] = await database
    .insert(websiteApiCredentials)
    .values({
      createdByUserId: request.context.user.id,
      expiresAt,
      label,
      organizationId: website.organizationId,
      publicKey: pair.publicKey,
      secretHash: hashWebsiteCredentialSecret(pair.secret),
      status: "active",
      updatedAt: now,
      websiteEnvironmentId: environment.id,
      websiteId: website.id,
    })
    .returning();

  if (!credential) {
    throw new WebsiteCredentialError("Website credential could not be created.");
  }

  await writeCredentialAudit({
    action: "website_credential.created",
    credential,
    database,
    environment,
    organizationId: website.organizationId,
    request,
    websiteId: website.id,
  });

  return { credential: toListItem({ ...credential, environment }), secret: pair.secret };
}

async function requireWebsiteCredentialForMutation({
  credentialId,
  database,
  request,
  websiteId,
}: {
  credentialId: string;
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "developer:credentials",
    request,
    websiteId,
  });
  assertSharozConnectedWebsite(website);

  const credential = await database.query.websiteApiCredentials.findFirst({
    where: and(
      eq(websiteApiCredentials.id, credentialId),
      eq(websiteApiCredentials.organizationId, website.organizationId),
      eq(websiteApiCredentials.websiteId, website.id),
    ),
    with: { environment: true },
  });

  if (!credential) {
    throw new WebsiteCredentialError("Website credential was not found.");
  }

  return { credential, website };
}

export async function revokeWebsiteCredential({
  credentialId,
  database,
  request,
  websiteId,
}: {
  credentialId: string;
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const { credential, website } = await requireWebsiteCredentialForMutation({
    credentialId,
    database,
    request,
    websiteId,
  });

  if (credential.status === "revoked" || credential.revokedAt) {
    return toListItem(credential);
  }

  const now = new Date();
  const [updated] = await database
    .update(websiteApiCredentials)
    .set({ revokedAt: now, status: "revoked", updatedAt: now })
    .where(eq(websiteApiCredentials.id, credential.id))
    .returning();

  if (!updated) {
    throw new WebsiteCredentialError("Website credential could not be revoked.");
  }

  await writeCredentialAudit({
    action: "website_credential.revoked",
    credential: updated,
    database,
    environment: credential.environment,
    organizationId: website.organizationId,
    request,
    websiteId: website.id,
  });

  return toListItem({ ...updated, environment: credential.environment });
}

export async function rotateWebsiteCredential({
  credentialId,
  database,
  request,
  websiteId,
}: {
  credentialId: string;
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}): Promise<WebsiteCredentialCreationResult> {
  const { credential, website } = await requireWebsiteCredentialForMutation({
    credentialId,
    database,
    request,
    websiteId,
  });

  if (credential.status === "revoked" || credential.revokedAt) {
    throw new WebsiteCredentialError("Revoked credentials cannot be rotated.");
  }

  const now = new Date();
  await database
    .update(websiteApiCredentials)
    .set({ revokedAt: now, status: "revoked", updatedAt: now })
    .where(eq(websiteApiCredentials.id, credential.id));

  const pair = createWebsiteCredentialPair();
  const [created] = await database
    .insert(websiteApiCredentials)
    .values({
      createdByUserId: request.context.user.id,
      expiresAt: credential.expiresAt,
      label: `${credential.label} rotated`,
      organizationId: website.organizationId,
      publicKey: pair.publicKey,
      secretHash: hashWebsiteCredentialSecret(pair.secret),
      status: "active",
      updatedAt: now,
      websiteEnvironmentId: credential.websiteEnvironmentId,
      websiteId: website.id,
    })
    .returning();

  if (!created) {
    throw new WebsiteCredentialError("Website credential could not be rotated.");
  }

  await writeCredentialAudit({
    action: "website_credential.rotated",
    credential: created,
    database,
    environment: credential.environment,
    organizationId: website.organizationId,
    request,
    websiteId: website.id,
  });

  return {
    credential: toListItem({ ...created, environment: credential.environment }),
    secret: pair.secret,
  };
}
