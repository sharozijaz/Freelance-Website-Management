import { describe, expect, it } from "vitest";
import {
  getPlatformMediaAssetById,
  listPlatformMediaAssets,
  resolvePublicMediaDimensions,
  resolvePublicMediaUrl,
} from "./media";
import type { PlatformRequestContext } from "./auth";

function context(): PlatformRequestContext {
  return {
    credentialId: "credential_1",
    credentialLabel: "Production",
    environmentId: "environment_1",
    environmentType: "production",
    organizationId: "org_1",
    websiteId: "site_1",
  };
}

function asset({
  deletedAt = null,
  id,
  metadata = { publicUrl: `https://cdn.example.com/${id}.jpg` },
  organizationId = "org_1",
  websiteId = "site_1",
}: {
  deletedAt?: Date | null;
  id: string;
  metadata?: Record<string, unknown>;
  organizationId?: string;
  websiteId?: string;
}) {
  return {
    altText: `Alt ${id}`,
    createdAt: new Date(`2026-07-0${id.endsWith("2") ? "2" : "1"}T00:00:00.000Z`),
    deletedAt,
    filename: `${id}.jpg`,
    id,
    metadata,
    mimeType: "image/jpeg",
    organizationId,
    websiteId,
  };
}

function createDatabase({
  assets = [],
  enabled = true,
}: {
  assets?: ReturnType<typeof asset>[];
  enabled?: boolean;
} = {}) {
  const scopedAssets = assets.filter(
    (item) =>
      item.organizationId === "org_1" && item.websiteId === "site_1" && item.deletedAt === null,
  );

  return {
    query: {
      mediaAssets: {
        findFirst: () => Promise.resolve(scopedAssets[0] ?? null),
        findMany: () => Promise.resolve(scopedAssets),
      },
      websiteModules: {
        findFirst: () => Promise.resolve(enabled ? { id: "module_media" } : null),
      },
      websites: {
        findFirst: () =>
          Promise.resolve({
            id: "site_1",
            organizationId: "org_1",
            websiteType: "sharoz_connected",
          }),
      },
    },
  } as never;
}

describe("Platform API media public URL resolver", () => {
  it("resolves only safe public media URLs", () => {
    const media = {
      altText: "Alt",
      deletedAt: null,
      id: "media_1",
      metadata: {
        height: 720,
        privateKey: "do-not-return",
        publicUrl: "https://cdn.example.com/image.jpg",
        width: 1280,
      },
      mimeType: "image/jpeg",
    };

    expect(resolvePublicMediaUrl(media)).toBe("https://cdn.example.com/image.jpg");
    expect(resolvePublicMediaDimensions(media)).toEqual({ height: 720, width: 1280 });
  });

  it("rejects non-http URLs and missing dimensions", () => {
    const media = {
      altText: null,
      deletedAt: null,
      id: "media_2",
      metadata: { height: "720", publicUrl: "file:///secret.png", width: 0 },
      mimeType: "image/png",
    };

    expect(resolvePublicMediaUrl(media)).toBeNull();
    expect(resolvePublicMediaDimensions(media)).toEqual({ height: null, width: null });
  });
});

describe("Platform API media reads", () => {
  it("rejects disabled Media modules", async () => {
    await expect(
      listPlatformMediaAssets({ context: context(), database: createDatabase({ enabled: false }) }),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENABLED" });
  });

  it("lists active same-tenant same-website media with stable pagination", async () => {
    const result = await listPlatformMediaAssets({
      context: context(),
      database: createDatabase({
        assets: [
          asset({ id: "media_1" }),
          asset({
            id: "media_2",
            metadata: {
              height: 400,
              publicUrl: "https://cdn.example.com/2.jpg",
              storageKey: "hidden",
              width: 600,
            },
          }),
          asset({ id: "archived", deletedAt: new Date("2026-07-03T00:00:00.000Z") }),
          asset({ id: "other_site", websiteId: "site_2" }),
          asset({ id: "other_org", organizationId: "org_2" }),
        ],
      }),
      options: { limit: 1, page: 2 },
    });

    expect(result).toMatchObject({
      items: [{ id: "media_2", url: "https://cdn.example.com/2.jpg" }],
      pagination: { hasNextPage: false, hasPreviousPage: true, limit: 1, page: 2, total: 2 },
    });
    expect(JSON.stringify(result)).not.toContain("storageKey");
    expect(JSON.stringify(result)).not.toContain("other_site");
    expect(JSON.stringify(result)).not.toContain("archived");
  });

  it("uses the safe resolver and leaves unsafe public URLs unresolved", async () => {
    const result = await listPlatformMediaAssets({
      context: context(),
      database: createDatabase({
        assets: [asset({ id: "media_1", metadata: { publicUrl: "javascript:alert(1)" } })],
      }),
    });

    expect(result.items[0]?.url).toBeNull();
  });

  it("returns NOT_FOUND for unavailable single assets", async () => {
    await expect(
      getPlatformMediaAssetById({
        context: context(),
        database: createDatabase({ assets: [asset({ id: "archived", deletedAt: new Date() })] }),
        id: "archived",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
