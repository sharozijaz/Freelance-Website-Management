import { and, eq, isNull } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import { auditLogs, mediaAssets, websiteModules } from "@agency/database/schema";
import { assertDashboardPermission } from "./access";
import { requireWebsiteAccess } from "./projects";
import type { DashboardRequest } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

const supportedMimeTypePattern = /^(image|video)\//;

export class MediaDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaDomainError";
  }
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function normalizeRequiredText(value: unknown, field: string, maxLength: number): string {
  const normalized = normalizeOptionalText(value, maxLength);
  if (!normalized) {
    throw new MediaDomainError(`${field} is required.`);
  }

  return normalized;
}

function normalizePositiveNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new MediaDomainError(`${field} must be a positive integer.`);
  }

  return parsed;
}

export function normalizePublicMediaUrl(value: unknown): string {
  const raw = normalizeRequiredText(value, "Public URL", 2000);
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new MediaDomainError("Public URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new MediaDomainError("Public URL must use HTTP or HTTPS.");
  }

  return url.toString();
}

function normalizeMimeType(value: unknown): string {
  const mimeType = normalizeRequiredText(value, "MIME type", 120).toLowerCase();
  if (!supportedMimeTypePattern.test(mimeType) && mimeType !== "application/pdf") {
    throw new MediaDomainError("MIME type is not supported for connected Media.");
  }

  return mimeType;
}

async function requireMediaWebsite({
  database,
  permission,
  request,
  websiteId,
}: {
  database: Database;
  permission: "media:manage" | "websites:read";
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "websites:read",
    request,
    websiteId,
  });
  assertDashboardPermission(request, permission, website.organizationId);

  if (website.websiteType !== "sharoz_connected") {
    throw new MediaDomainError("Media is only available for Sharoz Connected websites.");
  }

  const enabled = await database.query.websiteModules.findFirst({
    where: and(
      eq(websiteModules.organizationId, website.organizationId),
      eq(websiteModules.websiteId, website.id),
      eq(websiteModules.moduleKey, "media"),
      eq(websiteModules.enabled, true),
    ),
    columns: { id: true },
  });

  if (!enabled) {
    throw new MediaDomainError("Media module is not enabled for this website.");
  }

  return website;
}

function safeAuditMetadata(input: {
  lifecycle: "active" | "archived";
  mediaAssetId: string;
  mimeType: string;
  websiteId: string;
}) {
  return input;
}

async function writeMediaAudit({
  action,
  database,
  metadata,
  organizationId,
  request,
  resourceId,
}: {
  action:
    "media_asset.archived" | "media_asset.created" | "media_asset.restored" | "media_asset.updated";
  database: Database;
  metadata: ReturnType<typeof safeAuditMetadata>;
  organizationId: string;
  request: DashboardRequest;
  resourceId: string;
}) {
  await database.insert(auditLogs).values({
    action,
    actorUserId: request.context.user.id,
    metadata,
    organizationId,
    resourceId,
    resourceType: "media_asset",
  });
}

export async function listWebsiteMediaAssets({
  database,
  includeArchived = false,
  request,
  websiteId,
}: {
  database: Database;
  includeArchived?: boolean;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireMediaWebsite({
    database,
    permission: "websites:read",
    request,
    websiteId,
  });

  return database.query.mediaAssets.findMany({
    where: and(
      eq(mediaAssets.organizationId, website.organizationId),
      eq(mediaAssets.websiteId, website.id),
      includeArchived ? undefined : isNull(mediaAssets.deletedAt),
    ),
    orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt), sortDesc(table.id)],
  });
}

export async function listActiveWebsiteMediaForSelection({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  return listWebsiteMediaAssets({ database, includeArchived: false, request, websiteId });
}

export async function registerWebsiteMediaAsset({
  database,
  input,
  request,
  websiteId,
}: {
  database: Database;
  input: {
    altText?: unknown;
    fileSize?: unknown;
    filename?: unknown;
    height?: unknown;
    mimeType?: unknown;
    publicUrl?: unknown;
    width?: unknown;
  };
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireMediaWebsite({
    database,
    permission: "media:manage",
    request,
    websiteId,
  });
  const publicUrl = normalizePublicMediaUrl(input.publicUrl);
  const filename = normalizeRequiredText(input.filename, "Filename", 255);
  const mimeType = normalizeMimeType(input.mimeType);
  const width = normalizePositiveNumber(input.width, "Width");
  const height = normalizePositiveNumber(input.height, "Height");
  const fileSize = normalizePositiveNumber(input.fileSize, "File size");
  const metadata = {
    ...(fileSize ? { fileSize } : {}),
    ...(height ? { height } : {}),
    publicUrl,
    registeredSource: "external_public_url",
    ...(width ? { width } : {}),
  };

  const [asset] = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(mediaAssets)
      .values({
        altText: normalizeOptionalText(input.altText, 500),
        filename,
        metadata,
        mimeType,
        organizationId: website.organizationId,
        storageKey: `external:${publicUrl}`,
        uploadedByUserId: request.context.user.id,
        websiteId: website.id,
      })
      .returning();

    if (!created) {
      throw new MediaDomainError("Media asset could not be registered.");
    }

    await writeMediaAudit({
      action: "media_asset.created",
      database: tx as unknown as Database,
      metadata: safeAuditMetadata({
        lifecycle: "active",
        mediaAssetId: created.id,
        mimeType: created.mimeType,
        websiteId: website.id,
      }),
      organizationId: website.organizationId,
      request,
      resourceId: created.id,
    });

    return [created];
  });

  return asset;
}

async function requireMediaAssetAccess({
  database,
  mediaAssetId,
  permission,
  request,
  websiteId,
}: {
  database: Database;
  mediaAssetId: string;
  permission: "media:manage" | "websites:read";
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireMediaWebsite({ database, permission, request, websiteId });
  const asset = await database.query.mediaAssets.findFirst({
    where: and(
      eq(mediaAssets.id, mediaAssetId),
      eq(mediaAssets.organizationId, website.organizationId),
      eq(mediaAssets.websiteId, website.id),
    ),
  });

  if (!asset) {
    throw new MediaDomainError("Media asset was not found.");
  }

  return { asset, website };
}

export async function updateWebsiteMediaAsset({
  database,
  input,
  mediaAssetId,
  request,
  websiteId,
}: {
  database: Database;
  input: { altText?: unknown; filename?: unknown };
  mediaAssetId: string;
  request: DashboardRequest;
  websiteId: string;
}) {
  const { asset, website } = await requireMediaAssetAccess({
    database,
    mediaAssetId,
    permission: "media:manage",
    request,
    websiteId,
  });
  const now = new Date();
  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(mediaAssets)
      .set({
        altText:
          input.altText === undefined ? asset.altText : normalizeOptionalText(input.altText, 500),
        filename:
          input.filename === undefined
            ? asset.filename
            : normalizeRequiredText(input.filename, "Filename", 255),
        updatedAt: now,
      })
      .where(eq(mediaAssets.id, asset.id))
      .returning();

    if (!row) {
      throw new MediaDomainError("Media asset could not be updated.");
    }

    await writeMediaAudit({
      action: "media_asset.updated",
      database: tx as unknown as Database,
      metadata: safeAuditMetadata({
        lifecycle: row.deletedAt ? "archived" : "active",
        mediaAssetId: row.id,
        mimeType: row.mimeType,
        websiteId: website.id,
      }),
      organizationId: website.organizationId,
      request,
      resourceId: row.id,
    });

    return [row];
  });

  return updated;
}

export async function archiveWebsiteMediaAsset({
  database,
  mediaAssetId,
  request,
  websiteId,
}: {
  database: Database;
  mediaAssetId: string;
  request: DashboardRequest;
  websiteId: string;
}) {
  const { asset, website } = await requireMediaAssetAccess({
    database,
    mediaAssetId,
    permission: "media:manage",
    request,
    websiteId,
  });
  const now = new Date();
  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(mediaAssets)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(mediaAssets.id, asset.id))
      .returning();

    if (!row) throw new MediaDomainError("Media asset could not be archived.");

    await writeMediaAudit({
      action: "media_asset.archived",
      database: tx as unknown as Database,
      metadata: safeAuditMetadata({
        lifecycle: "archived",
        mediaAssetId: row.id,
        mimeType: row.mimeType,
        websiteId: website.id,
      }),
      organizationId: website.organizationId,
      request,
      resourceId: row.id,
    });

    return [row];
  });

  return updated;
}

export async function restoreWebsiteMediaAsset({
  database,
  mediaAssetId,
  request,
  websiteId,
}: {
  database: Database;
  mediaAssetId: string;
  request: DashboardRequest;
  websiteId: string;
}) {
  const { asset, website } = await requireMediaAssetAccess({
    database,
    mediaAssetId,
    permission: "media:manage",
    request,
    websiteId,
  });
  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(mediaAssets)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(mediaAssets.id, asset.id))
      .returning();

    if (!row) throw new MediaDomainError("Media asset could not be restored.");

    await writeMediaAudit({
      action: "media_asset.restored",
      database: tx as unknown as Database,
      metadata: safeAuditMetadata({
        lifecycle: "active",
        mediaAssetId: row.id,
        mimeType: row.mimeType,
        websiteId: website.id,
      }),
      organizationId: website.organizationId,
      request,
      resourceId: row.id,
    });

    return [row];
  });

  return updated;
}
