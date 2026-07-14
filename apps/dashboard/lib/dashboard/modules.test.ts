import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PermissionDeniedError } from "@agency/auth";
import { auditLogs, websiteModules } from "@agency/database/schema";
import type { ModuleKey, WebsiteType } from "@agency/lib/modules";
import {
  disableWebsiteModule,
  enableWebsiteModule,
  isWebsiteModuleEnabled,
  listWebsiteModules,
  ModuleEnablementError,
  parseModuleKey,
} from "./modules";
import type { DashboardRequest } from "./types";

const migrationUrl = new URL(
  "../../../../packages/database/drizzle/0005_exotic_captain_stacy.sql",
  import.meta.url,
);

interface ModuleRow {
  enabled: boolean;
  id: string;
  moduleKey: ModuleKey;
  organizationId: string;
  websiteId: string;
}

function createRequest(
  permissions: string[] = ["websites:read", "modules:read", "modules:manage"],
) {
  return {
    access: {
      activeOrganizationId: "org_1",
      canManageMembers: true,
      canReadAudit: true,
      canReadContent: true,
      canReadWebsites: true,
      canWriteContent: true,
      isAgencyUser: false,
      role: "client_admin",
      workspaceMode: "client",
    },
    context: {
      activeOrganizationId: "org_1",
      memberships: [
        {
          organizationId: "org_1",
          permissions,
          role: "viewer",
          status: "active",
          userId: "user_1",
        },
      ],
      session: { expiresAt: new Date(), id: "session_1", userId: "user_1" },
      user: { email: "owner@example.com", id: "user_1", name: "Owner" },
    },
  } satisfies DashboardRequest;
}

function createDatabase({
  modules = [],
  organizationId = "org_1",
  websiteId = "site_1",
  websiteType = "sharoz_connected",
}: {
  modules?: ModuleRow[];
  organizationId?: string;
  websiteId?: string;
  websiteType?: WebsiteType;
} = {}) {
  const state = {
    auditLogs: [] as Record<string, unknown>[],
    modules: [...modules],
    website: {
      deletedAt: null,
      id: websiteId,
      organization: { id: organizationId, name: "Acme" },
      organizationId,
      projects: [],
      websiteType,
    },
  };

  const database = {
    insert(table: unknown) {
      return {
        values(value: Record<string, unknown>) {
          if (table === websiteModules) {
            const existing = state.modules.find(
              (row) => row.websiteId === value.websiteId && row.moduleKey === value.moduleKey,
            );
            if (existing) {
              throw new Error("duplicate key value violates unique constraint");
            }
            state.modules.push({
              enabled: Boolean(value.enabled),
              id: `module_${String(state.modules.length + 1)}`,
              moduleKey: value.moduleKey as ModuleKey,
              organizationId: value.organizationId as string,
              websiteId: value.websiteId as string,
            });
          }
          if (table === auditLogs) {
            state.auditLogs.push(value);
          }
          return Promise.resolve();
        },
      };
    },
    query: {
      websiteModules: {
        findFirst: () =>
          Promise.resolve(
            state.modules.find(
              (row) => row.organizationId === organizationId && row.websiteId === websiteId,
            ) ?? null,
          ),
        findMany: () =>
          Promise.resolve(
            state.modules.filter(
              (row) =>
                row.organizationId === organizationId && row.websiteId === websiteId && row.enabled,
            ),
          ),
      },
      websites: {
        findFirst: () => Promise.resolve(state.website),
      },
    },
    update(table: unknown) {
      return {
        set(value: Partial<ModuleRow> & Record<string, unknown>) {
          return {
            where: () => {
              if (table === websiteModules) {
                const target =
                  state.modules.find(
                    (row) => row.organizationId === organizationId && row.websiteId === websiteId,
                  ) ?? state.modules[0];
                if (target) {
                  Object.assign(target, value);
                }
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
  };

  return { database: database as never, state };
}

describe("website module service", () => {
  it("rejects unknown module keys", () => {
    expect(() => parseModuleKey("unknown")).toThrow(ModuleEnablementError);
  });

  it("lists enabled modules for an accessible website", async () => {
    const { database } = createDatabase({
      modules: [
        {
          enabled: true,
          id: "module_1",
          moduleKey: "forms",
          organizationId: "org_1",
          websiteId: "site_1",
        },
      ],
    });

    const state = await listWebsiteModules({
      database,
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(state.modules.find((module) => module.key === "forms")?.enabled).toBe(true);
    expect(state.modules.find((module) => module.key === "blog")?.enabled).toBe(false);
  });

  it("enables and disables modules for Sharoz Connected websites", async () => {
    const { database, state } = createDatabase();

    await enableWebsiteModule({
      database,
      moduleKey: "forms",
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(
      await isWebsiteModuleEnabled({
        database,
        moduleKey: "forms",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).toBe(true);

    await disableWebsiteModule({
      database,
      moduleKey: "forms",
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(state.modules.find((module) => module.moduleKey === "forms")?.enabled).toBe(false);
    expect(state.auditLogs.map((log) => log.action)).toEqual([
      "website_module.enabled",
      "website_module.disabled",
    ]);
  });

  it("rejects enablement for WordPress websites", async () => {
    const { database } = createDatabase({ websiteType: "wordpress" });

    await expect(
      enableWebsiteModule({
        database,
        moduleKey: "forms",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(ModuleEnablementError);
  });

  it("rejects enablement for external legacy websites", async () => {
    const { database } = createDatabase({ websiteType: "external_legacy" });

    await expect(
      enableWebsiteModule({
        database,
        moduleKey: "forms",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(ModuleEnablementError);
  });

  it("requires catalog and customers before enabling orders", async () => {
    const { database } = createDatabase();

    await expect(
      enableWebsiteModule({
        database,
        moduleKey: "orders",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow("Orders is planned, not available yet.");
  });

  it("does not expose planned modules as enabled even if old rows exist", async () => {
    const { database } = createDatabase({
      modules: [
        {
          enabled: true,
          id: "catalog",
          moduleKey: "catalog",
          organizationId: "org_1",
          websiteId: "site_1",
        },
      ],
    });

    const state = await listWebsiteModules({
      database,
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(state.modules.find((module) => module.key === "catalog")).toMatchObject({
      availability: "planned",
      enabled: false,
    });
  });

  it("rejects disabling catalog or customers while orders is enabled", async () => {
    const modules: ModuleRow[] = [
      {
        enabled: true,
        id: "catalog",
        moduleKey: "catalog",
        organizationId: "org_1",
        websiteId: "site_1",
      },
      {
        enabled: true,
        id: "customers",
        moduleKey: "customers",
        organizationId: "org_1",
        websiteId: "site_1",
      },
      {
        enabled: true,
        id: "orders",
        moduleKey: "orders",
        organizationId: "org_1",
        websiteId: "site_1",
      },
    ];
    const { database } = createDatabase({ modules });

    await expect(
      disableWebsiteModule({
        database,
        moduleKey: "catalog",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow("Catalog is planned, not available yet.");

    await expect(
      disableWebsiteModule({
        database,
        moduleKey: "customers",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow("Customers is planned, not available yet.");
  });

  it("enforces module permissions", async () => {
    const { database } = createDatabase();

    await expect(
      enableWebsiteModule({
        database,
        moduleKey: "forms",
        request: createRequest(["websites:read", "modules:read"]),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("rejects cross-tenant module reads and mutations", async () => {
    const { database } = createDatabase({ organizationId: "org_2" });

    await expect(
      listWebsiteModules({ database, request: createRequest(), websiteId: "site_1" }),
    ).rejects.toThrow(PermissionDeniedError);

    await expect(
      enableWebsiteModule({
        database,
        moduleKey: "forms",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});

describe("website module migration", () => {
  it("classifies existing websites as external legacy by default", () => {
    const migration = readFileSync(migrationUrl, "utf8");

    expect(migration).toContain(
      `ALTER TABLE "websites" ADD COLUMN "website_type" "website_type" DEFAULT 'external_legacy' NOT NULL`,
    );
  });

  it("prevents duplicate website/module records", () => {
    const migration = readFileSync(migrationUrl, "utf8");

    expect(migration).toContain(
      `CREATE UNIQUE INDEX "website_modules_website_module_idx" ON "website_modules" USING btree ("website_id","module_key")`,
    );
  });
});
