import { describe, expect, it } from "vitest";
import { auditLogs, mediaAssets } from "@agency/database/schema";
import type { MembershipRole } from "@agency/auth";
import {
  archiveWebsiteMediaAsset,
  normalizePublicMediaUrl,
  registerWebsiteMediaAsset,
  updateWebsiteMediaAsset,
} from "./media";
import type { DashboardRequest } from "./types";

interface MediaRow {
  altText: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  filename: string;
  id: string;
  metadata: Record<string, unknown>;
  mimeType: string;
  organizationId: string;
  storageKey: string;
  updatedAt: Date;
  uploadedByUserId: string | null;
  websiteId: string | null;
}

function createRequest({
  permissions = ["websites:read", "media:manage"],
  role = "client_admin",
}: {
  permissions?: string[];
  role?: MembershipRole;
} = {}): DashboardRequest {
  return {
    access: {
      activeOrganizationId: "org_a",
      canManageMembers: true,
      canReadAudit: true,
      canReadContent: true,
      canReadWebsites: true,
      canWriteContent: true,
      isAgencyUser: false,
      role,
      workspaceMode: "client",
    },
    context: {
      activeOrganizationId: "org_a",
      memberships: [
        {
          organizationId: "org_a",
          permissions,
          role,
          status: "active",
          userId: "user_a",
        },
      ],
      session: {
        activeOrganizationId: "org_a",
        expiresAt: new Date(Date.now() + 60_000),
        id: "session_a",
        userId: "user_a",
      },
      user: {
        email: "editor@example.com",
        emailVerified: true,
        id: "user_a",
        image: null,
        name: "Editor",
      },
    },
  };
}

function createDatabase({
  mediaWebsiteId = "website_a",
  moduleEnabled = true,
}: {
  mediaWebsiteId?: string | null;
  moduleEnabled?: boolean;
} = {}) {
  const website = {
    deletedAt: null,
    id: "website_a",
    organization: { id: "org_a", name: "Org A" },
    organizationId: "org_a",
    projects: [],
    websiteType: "sharoz_connected" as const,
  };
  const state = {
    audits: [] as Record<string, unknown>[],
    media: [
      {
        altText: "Initial alt",
        createdAt: new Date("2026-07-13T00:00:00.000Z"),
        deletedAt: null,
        filename: "initial.jpg",
        id: "media_a",
        metadata: { publicUrl: "https://cdn.example.com/initial.jpg", secret: "hidden" },
        mimeType: "image/jpeg",
        organizationId: "org_a",
        storageKey: "external:https://cdn.example.com/initial.jpg",
        updatedAt: new Date("2026-07-13T00:00:00.000Z"),
        uploadedByUserId: "user_a",
        websiteId: mediaWebsiteId,
      },
    ] as MediaRow[],
  };

  const database = {
    insert: (table: unknown) => ({
      values(value: Record<string, unknown>) {
        if (table === mediaAssets) {
          const row = {
            createdAt: new Date("2026-07-13T00:00:00.000Z"),
            deletedAt: null,
            id: "media_new",
            updatedAt: new Date("2026-07-13T00:00:00.000Z"),
            ...value,
          } as MediaRow;
          state.media.push(row);
          return { returning: () => Promise.resolve([row]) };
        }

        if (table === auditLogs) {
          state.audits.push(value);
        }

        return { returning: () => Promise.resolve([value]) };
      },
    }),
    query: {
      mediaAssets: {
        findFirst: () =>
          Promise.resolve(
            state.media.find((asset) => asset.websiteId === "website_a" && !asset.deletedAt) ??
              null,
          ),
        findMany: () =>
          Promise.resolve(
            state.media.filter((asset) => asset.websiteId === "website_a" && !asset.deletedAt),
          ),
      },
      websiteModules: {
        findFirst: () => Promise.resolve(moduleEnabled ? { id: "module_media" } : null),
      },
      websites: {
        findFirst: () => Promise.resolve(website),
      },
    },
    transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback(database),
    update: (table: unknown) => ({
      set(value: Partial<MediaRow>) {
        return {
          where: () => ({
            returning: () => {
              if (table === mediaAssets) {
                const row = state.media.find(
                  (asset) => asset.websiteId === "website_a" && !asset.deletedAt,
                );
                if (!row) return Promise.resolve([]);
                Object.assign(row, value);
                return Promise.resolve([row]);
              }

              return Promise.resolve([]);
            },
          }),
        };
      },
    }),
  };

  return { database: database as never, state };
}

describe("Media dashboard service", () => {
  it("normalizes only public HTTP and HTTPS URLs", () => {
    expect(normalizePublicMediaUrl("https://cdn.example.com/file.jpg")).toBe(
      "https://cdn.example.com/file.jpg",
    );
    expect(() => normalizePublicMediaUrl("javascript:alert(1)")).toThrow(
      "Public URL must use HTTP or HTTPS.",
    );
    expect(() => normalizePublicMediaUrl("data:image/png;base64,abc")).toThrow(
      "Public URL must use HTTP or HTTPS.",
    );
    expect(() => normalizePublicMediaUrl("file:///secret.jpg")).toThrow(
      "Public URL must use HTTP or HTTPS.",
    );
  });

  it("registers website-scoped media metadata and writes a safe audit event", async () => {
    const { database, state } = createDatabase();
    const asset = await registerWebsiteMediaAsset({
      database,
      input: {
        altText: "Team photo",
        filename: "team.jpg",
        height: "600",
        mimeType: "image/jpeg",
        publicUrl: "https://cdn.example.com/team.jpg",
        width: "900",
      },
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(asset).toMatchObject({
      altText: "Team photo",
      filename: "team.jpg",
      organizationId: "org_a",
      websiteId: "website_a",
    });
    expect(state.audits).toContainEqual(
      expect.objectContaining({
        action: "media_asset.created",
        resourceType: "media_asset",
      }),
    );
    expect(JSON.stringify(state.audits)).not.toContain("https://cdn.example.com/team.jpg");
  });

  it("updates safe metadata without allowing cross-site media mutation", async () => {
    const { database, state } = createDatabase();

    await expect(
      updateWebsiteMediaAsset({
        database: createDatabase({ mediaWebsiteId: "website_b" }).database,
        input: { altText: "Blocked" },
        mediaAssetId: "media_a",
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Media asset was not found.");

    const updated = await updateWebsiteMediaAsset({
      database,
      input: { altText: "Accessible alt", filename: "accessible.jpg" },
      mediaAssetId: "media_a",
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(updated.altText).toBe("Accessible alt");
    expect(updated.filename).toBe("accessible.jpg");
    expect(state.media[0]?.metadata).toEqual(
      expect.objectContaining({ publicUrl: "https://cdn.example.com/initial.jpg" }),
    );
  });

  it("archives only scoped media assets", async () => {
    await expect(
      archiveWebsiteMediaAsset({
        database: createDatabase({ mediaWebsiteId: "website_b" }).database,
        mediaAssetId: "media_a",
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Media asset was not found.");

    const { database } = createDatabase();
    const archived = await archiveWebsiteMediaAsset({
      database,
      mediaAssetId: "media_a",
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(archived.deletedAt).toBeInstanceOf(Date);
  });
});
