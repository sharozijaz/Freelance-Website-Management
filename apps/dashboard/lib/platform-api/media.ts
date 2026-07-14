import { and, eq, isNull } from "drizzle-orm";
import type { MediaAsset, MediaAssetResponse, MediaListResponse } from "@sharoz/contracts";
import type { createDatabaseClient } from "@agency/database";
import { mediaAssets } from "@agency/database/schema";
import type { PlatformRequestContext } from "./auth";
import { PlatformApiError } from "./errors";
import { requireEnabledModule } from "./modules";

type Database = ReturnType<typeof createDatabaseClient>;

const defaultPage = 1;
const defaultLimit = 20;
const maxLimit = 50;

export interface PlatformMediaAsset {
  altText: string | null;
  createdAt?: Date;
  deletedAt: Date | null;
  filename?: string;
  id: string;
  metadata: Record<string, unknown>;
  mimeType: string;
}

type PlatformMediaAssetRow = Required<Pick<PlatformMediaAsset, "createdAt" | "filename">> &
  PlatformMediaAsset;

function numberMetadata(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function stringUrlMetadata(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function resolvePublicMediaUrl(media: PlatformMediaAsset): string | null {
  return (
    stringUrlMetadata(media.metadata.publicUrl) ??
    stringUrlMetadata(media.metadata.cdnUrl) ??
    stringUrlMetadata(media.metadata.externalUrl)
  );
}

export function resolvePublicMediaDimensions(media: PlatformMediaAsset) {
  return {
    height: numberMetadata(media.metadata.height),
    width: numberMetadata(media.metadata.width),
  };
}

function dateToIso(value: Date) {
  return value.toISOString();
}

function normalizePositiveInteger({
  fallback,
  max,
  min = 1,
  name,
  value,
}: {
  fallback: number;
  max?: number;
  min?: number;
  name: string;
  value?: number | null | undefined;
}) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < min || (max !== undefined && value > max)) {
    throw new PlatformApiError({
      code: "INVALID_REQUEST",
      message:
        max === undefined
          ? `${name} must be an integer greater than or equal to ${String(min)}.`
          : `${name} must be an integer between ${String(min)} and ${String(max)}.`,
    });
  }

  return value;
}

export function toSafeMediaAsset(media: PlatformMediaAssetRow): MediaAsset | null {
  if (media.deletedAt) {
    return null;
  }

  const dimensions = resolvePublicMediaDimensions(media);

  return {
    altText: media.altText,
    createdAt: dateToIso(media.createdAt),
    filename: media.filename,
    height: dimensions.height,
    id: media.id,
    mimeType: media.mimeType,
    url: resolvePublicMediaUrl(media),
    width: dimensions.width,
  };
}

export interface MediaListOptions {
  limit?: number | null;
  page?: number | null;
}

export async function listPlatformMediaAssets({
  context,
  database,
  options = {},
}: {
  context: PlatformRequestContext;
  database: Database;
  options?: MediaListOptions;
}): Promise<MediaListResponse> {
  await requireEnabledModule({ context, database, moduleKey: "media" });

  const page = normalizePositiveInteger({
    fallback: defaultPage,
    name: "page",
    value: options.page,
  });
  const limit = normalizePositiveInteger({
    fallback: defaultLimit,
    max: maxLimit,
    name: "limit",
    value: options.limit,
  });
  const rows = await database.query.mediaAssets.findMany({
    where: and(
      eq(mediaAssets.organizationId, context.organizationId),
      eq(mediaAssets.websiteId, context.websiteId),
      isNull(mediaAssets.deletedAt),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
  });
  const items = rows.flatMap((row) => {
    const asset = toSafeMediaAsset(row);
    return asset ? [asset] : [];
  });
  const offset = (page - 1) * limit;
  const pageItems = items.slice(offset, offset + limit);
  const totalPages = Math.ceil(items.length / limit);

  return {
    items: pageItems,
    pagination: {
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      limit,
      page,
      total: items.length,
      totalPages,
    },
  };
}

export async function getPlatformMediaAssetById({
  context,
  database,
  id,
}: {
  context: PlatformRequestContext;
  database: Database;
  id: string;
}): Promise<MediaAssetResponse> {
  await requireEnabledModule({ context, database, moduleKey: "media" });

  const row = await database.query.mediaAssets.findFirst({
    where: and(
      eq(mediaAssets.id, id),
      eq(mediaAssets.organizationId, context.organizationId),
      eq(mediaAssets.websiteId, context.websiteId),
      isNull(mediaAssets.deletedAt),
    ),
  });
  const asset = row ? toSafeMediaAsset(row) : null;

  if (!asset) {
    throw new PlatformApiError({ code: "NOT_FOUND" });
  }

  return { asset };
}
