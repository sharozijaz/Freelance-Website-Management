import { describe, expect, it } from "vitest";
import { PermissionDeniedError, verifyEnvironmentAccessSecret } from "@agency/auth";
import { auditLogs, websiteEnvironments } from "@agency/database/schema";
import {
  listWebsiteEnvironments,
  rotatePreviewAccessToken,
  updateStagingAccessProtection,
  WebsiteEnvironmentError,
} from "./environments";
import type { DashboardRequest } from "./types";

interface EnvironmentRow {
  baseUrl: string | null;
  createdAt: Date;
  id: string;
  name: string;
  organizationId: string;
  previewAccessTokenHash: string | null;
  previewAccessTokenRotatedAt: Date | null;
  stagingAccessEnabled: boolean;
  stagingAccessSecretHash: string | null;
  stagingAccessSecretRotatedAt: Date | null;
  status: "active" | "inactive";
  type: "production" | "staging";
  updatedAt: Date;
  websiteId: string;
}

function createRequest(permissions = ["websites:read", "websites:manage"]) {
  return {
    access: {
      activeOrganizationId: "org_1",
      canManageMembers: true,
      canReadAudit: true,
      canReadContent: true,
      canReadWebsites: true,
      canWriteContent: true,
      isAgencyUser: false,
      role: "viewer",
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
  organizationId = "org_1",
  websiteId = "site_1",
}: {
  organizationId?: string;
  websiteId?: string;
} = {}) {
  const now = new Date("2026-07-13T00:00:00.000Z");
  const environments: EnvironmentRow[] = [
    {
      baseUrl: "https://staging.example.com",
      createdAt: now,
      id: "environment_staging",
      name: "Staging",
      organizationId,
      previewAccessTokenHash: null,
      previewAccessTokenRotatedAt: null,
      stagingAccessEnabled: false,
      stagingAccessSecretHash: null,
      stagingAccessSecretRotatedAt: null,
      status: "active",
      type: "staging",
      updatedAt: now,
      websiteId,
    },
    {
      baseUrl: "https://example.com",
      createdAt: now,
      id: "environment_production",
      name: "Production",
      organizationId,
      previewAccessTokenHash: null,
      previewAccessTokenRotatedAt: null,
      stagingAccessEnabled: false,
      stagingAccessSecretHash: null,
      stagingAccessSecretRotatedAt: null,
      status: "active",
      type: "production",
      updatedAt: now,
      websiteId,
    },
  ];
  const state = {
    auditLogs: [] as Record<string, unknown>[],
    deployments: [] as Record<string, unknown>[],
    environments,
    website: {
      deletedAt: null,
      id: websiteId,
      organization: { id: organizationId, name: "Acme" },
      organizationId,
      previewUrl: "https://staging.example.com",
      productionUrl: "https://example.com",
      projects: [],
      websiteType: "sharoz_connected",
    },
  };

  function updateEnvironment(value: Partial<EnvironmentRow>) {
    const target = state.environments.find((environment) =>
      value.previewAccessTokenHash !== undefined ||
      value.stagingAccessEnabled !== undefined ||
      value.name !== undefined
        ? true
        : environment.id === "environment_staging",
    );

    if (!target) return null;
    Object.assign(target, value);
    return target;
  }

  const database = {
    insert(table: unknown) {
      return {
        values(value: Record<string, unknown>) {
          if (table === auditLogs) {
            state.auditLogs.push(value);
          }
          return { returning: () => Promise.resolve([]) };
        },
      };
    },
    query: {
      deployments: {
        findMany: () => Promise.resolve(state.deployments),
      },
      websiteEnvironments: {
        findFirst: () => Promise.resolve(state.environments[0] ?? null),
        findMany: () => Promise.resolve(state.environments),
      },
      websites: {
        findFirst: () => Promise.resolve(state.website),
      },
    },
    transaction<T>(callback: (tx: never) => Promise<T>) {
      return callback(database as never);
    },
    update(table: unknown) {
      return {
        set(value: Partial<EnvironmentRow>) {
          return {
            where: () => ({
              returning: () => {
                if (table === websiteEnvironments) {
                  const updated = updateEnvironment(value);
                  return Promise.resolve(updated ? [updated] : []);
                }
                return Promise.resolve([]);
              },
            }),
          };
        },
      };
    },
  };

  return { database: database as never, state };
}

function requireEnvironment(row: EnvironmentRow | undefined): EnvironmentRow {
  if (!row) {
    throw new Error("Expected test environment.");
  }

  return row;
}

describe("dashboard environment security service", () => {
  it("rotates preview token with organization scope and stores only a hash", async () => {
    const { database, state } = createDatabase();

    const result = await rotatePreviewAccessToken({
      database,
      environmentId: "environment_staging",
      request: createRequest(),
      websiteId: "site_1",
    });

    const environment = requireEnvironment(state.environments[0]);

    expect(result.token).toMatch(/^env_/);
    expect(environment.previewAccessTokenHash).toMatch(/^sha256:/);
    expect(environment.previewAccessTokenHash).not.toContain(result.token);
    expect(
      verifyEnvironmentAccessSecret({
        hash: environment.previewAccessTokenHash ?? "",
        secret: result.token,
      }),
    ).toBe(true);
    expect(JSON.stringify(state.auditLogs)).not.toContain(result.token);
    expect(JSON.stringify(state.auditLogs)).not.toContain(environment.previewAccessTokenHash);
  });

  it("dashboard loader never returns stored secret hashes", async () => {
    const { database, state } = createDatabase();
    const environment = requireEnvironment(state.environments[0]);
    environment.previewAccessTokenHash = "sha256:preview";
    environment.stagingAccessSecretHash = "sha256:staging";

    const result = await listWebsiteEnvironments({
      database,
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(result.environments[0]).toMatchObject({
      previewAccessConfigured: true,
      stagingAccessSecretConfigured: true,
    });
    expect(result.environments[0]).not.toHaveProperty("previewAccessTokenHash");
    expect(result.environments[0]).not.toHaveProperty("stagingAccessSecretHash");
  });

  it("rejects preview rotation and staging access changes for production environments", async () => {
    const { database, state } = createDatabase();
    state.environments.reverse();

    await expect(
      rotatePreviewAccessToken({
        database,
        environmentId: "environment_production",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(WebsiteEnvironmentError);

    await expect(
      updateStagingAccessProtection({
        database,
        enabled: true,
        environmentId: "environment_production",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(WebsiteEnvironmentError);
  });

  it("enables staging access with a one-time secret and safe audit metadata", async () => {
    const { database, state } = createDatabase();

    const result = await updateStagingAccessProtection({
      database,
      enabled: true,
      environmentId: "environment_staging",
      request: createRequest(),
      rotateSecret: true,
      websiteId: "site_1",
    });

    const environment = requireEnvironment(state.environments[0]);

    expect(result.token).toMatch(/^env_/);
    expect(environment.stagingAccessEnabled).toBe(true);
    expect(environment.stagingAccessSecretHash).toMatch(/^sha256:/);
    expect(JSON.stringify(state.auditLogs)).not.toContain(result.token);
    expect(JSON.stringify(state.auditLogs)).not.toContain(environment.stagingAccessSecretHash);
    expect(state.auditLogs[0]).toMatchObject({
      action: "website_environment.staging_access_enabled",
      metadata: { enabled: true, environmentId: "environment_staging", rotatedSecret: true },
    });
  });

  it("rotates staging secret and invalidates the old secret", async () => {
    const { database, state } = createDatabase();
    const enabled = await updateStagingAccessProtection({
      database,
      enabled: true,
      environmentId: "environment_staging",
      request: createRequest(),
      rotateSecret: true,
      websiteId: "site_1",
    });
    const oldSecret = enabled.token ?? "";
    const oldHash = requireEnvironment(state.environments[0]).stagingAccessSecretHash ?? "";

    const rotated = await updateStagingAccessProtection({
      database,
      enabled: true,
      environmentId: "environment_staging",
      request: createRequest(),
      rotateSecret: true,
      websiteId: "site_1",
    });

    expect(rotated.token).not.toBe(oldSecret);
    const environment = requireEnvironment(state.environments[0]);
    expect(environment.stagingAccessSecretHash).not.toBe(oldHash);
    expect(
      verifyEnvironmentAccessSecret({
        hash: environment.stagingAccessSecretHash ?? "",
        secret: oldSecret,
      }),
    ).toBe(false);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "website_environment.staging_secret_rotated",
    });
  });

  it("disables staging access on the scoped environment only", async () => {
    const { database, state } = createDatabase();
    requireEnvironment(state.environments[0]).stagingAccessEnabled = true;

    await updateStagingAccessProtection({
      database,
      enabled: false,
      environmentId: "environment_staging",
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(state.environments[0]?.stagingAccessEnabled).toBe(false);
    expect(state.environments[1]?.stagingAccessEnabled).toBe(false);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "website_environment.staging_access_disabled",
      metadata: { enabled: false, environmentId: "environment_staging" },
    });
  });

  it("enforces organization permissions for environment security changes", async () => {
    await expect(
      updateStagingAccessProtection({
        database: createDatabase({ organizationId: "org_2" }).database,
        enabled: true,
        environmentId: "environment_staging",
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
