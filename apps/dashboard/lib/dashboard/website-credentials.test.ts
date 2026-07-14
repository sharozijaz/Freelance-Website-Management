import { describe, expect, it } from "vitest";
import { PermissionDeniedError } from "@agency/auth";
import {
  authenticateWebsiteCredential,
  verifyWebsiteCredentialSecret,
} from "@agency/auth/website-credentials";
import { auditLogs, websiteApiCredentials } from "@agency/database/schema";
import {
  createWebsiteCredential,
  listWebsiteCredentials,
  revokeWebsiteCredential,
  rotateWebsiteCredential,
  WebsiteCredentialError,
} from "./website-credentials";
import type { DashboardRequest } from "./types";

interface CredentialRow {
  createdAt: Date;
  createdByUserId: string | null;
  expiresAt: Date | null;
  id: string;
  label: string;
  lastUsedAt: Date | null;
  organizationId: string;
  publicKey: string;
  revokedAt: Date | null;
  secretHash: string;
  status: "active" | "revoked";
  updatedAt: Date;
  websiteEnvironmentId: string;
  websiteId: string;
  environment: EnvironmentRow;
}

interface EnvironmentRow {
  createdAt: Date;
  id: string;
  name: string;
  organizationId: string;
  status: "active" | "inactive";
  type: "production" | "staging";
  updatedAt: Date;
  websiteId: string;
}

function createRequest(permissions = ["developer:credentials"]) {
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
  credentials = [],
  organizationId = "org_1",
  websiteId = "site_1",
  websiteType = "sharoz_connected",
}: {
  credentials?: CredentialRow[];
  organizationId?: string;
  websiteId?: string;
  websiteType?: "external_legacy" | "sharoz_connected" | "wordpress";
} = {}) {
  const state = {
    auditLogs: [] as Record<string, unknown>[],
    credentials: [...credentials],
    environments: [
      {
        createdAt: new Date(),
        id: "environment_staging",
        name: "Staging",
        organizationId,
        status: "active",
        type: "staging",
        updatedAt: new Date(),
        websiteId,
      },
      {
        createdAt: new Date(),
        id: "environment_production",
        name: "Production",
        organizationId,
        status: "active",
        type: "production",
        updatedAt: new Date(),
        websiteId,
      },
    ] satisfies EnvironmentRow[],
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
          if (table === websiteApiCredentials) {
            if (state.credentials.some((item) => item.publicKey === value.publicKey)) {
              throw new Error("duplicate public key");
            }

            const now = new Date();
            const environment =
              state.environments.find((item) => item.id === value.websiteEnvironmentId) ??
              state.environments[0];

            if (!environment) {
              throw new Error("test environment missing");
            }

            const credential = {
              createdAt: now,
              createdByUserId: value.createdByUserId as string,
              expiresAt: (value.expiresAt as Date | null) ?? null,
              id: `credential_${String(state.credentials.length + 1)}`,
              label: value.label as string,
              lastUsedAt: null,
              organizationId: value.organizationId as string,
              publicKey: value.publicKey as string,
              revokedAt: null,
              secretHash: value.secretHash as string,
              status: value.status as "active",
              updatedAt: now,
              websiteEnvironmentId: value.websiteEnvironmentId as string,
              websiteId: value.websiteId as string,
              environment,
            } satisfies CredentialRow;
            state.credentials.push(credential);
            return { returning: () => Promise.resolve([credential]) };
          }

          if (table === auditLogs) {
            state.auditLogs.push(value);
          }

          return { returning: () => Promise.resolve([]) };
        },
      };
    },
    query: {
      websiteApiCredentials: {
        findFirst: () =>
          Promise.resolve(
            state.credentials.find(
              (credential) =>
                credential.organizationId === organizationId &&
                credential.websiteId === websiteId &&
                credential.status === "active",
            ) ??
              state.credentials[0] ??
              null,
          ),
        findMany: () => Promise.resolve(state.credentials),
      },
      websiteEnvironments: {
        findFirst: () => Promise.resolve(state.environments[0] ?? null),
        findMany: () => Promise.resolve(state.environments),
      },
      websites: {
        findFirst: () => Promise.resolve(state.website),
      },
    },
    update(table: unknown) {
      return {
        set(value: Partial<CredentialRow>) {
          const applyUpdate = () => {
            if (table === websiteApiCredentials) {
              const target = state.credentials[0];
              if (target) {
                Object.assign(target, value);
                return target;
              }
            }

            return null;
          };

          return {
            returning: () => {
              const target = applyUpdate();
              return Promise.resolve(target ? [target] : []);
            },
            where: () => {
              const target = applyUpdate();
              return {
                returning: () => Promise.resolve(target ? [target] : []),
              };
            },
          };
        },
      };
    },
  };

  return { database: database as never, state };
}

describe("dashboard website credential service", () => {
  it("creates credentials for Sharoz Connected websites and returns plaintext once", async () => {
    const { database, state } = createDatabase();
    const result = await createWebsiteCredential({
      database,
      input: { environmentId: "environment_staging", label: "Production" },
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(result.credential.publicKey).toMatch(/^spk_/);
    expect(result.secret).toMatch(/^sps_/);
    expect(state.credentials).toHaveLength(1);
    expect(state.credentials[0]?.secretHash).not.toContain(result.secret);
    expect(
      verifyWebsiteCredentialSecret({
        hash: state.credentials[0]?.secretHash ?? "",
        secret: result.secret,
      }),
    ).toBe(true);
  });

  it("lists safe metadata without plaintext or secret hash", async () => {
    const { database } = createDatabase({
      credentials: [
        {
          createdAt: new Date(),
          createdByUserId: "user_1",
          expiresAt: null,
          id: "credential_1",
          label: "Production",
          lastUsedAt: null,
          organizationId: "org_1",
          publicKey: "spk_public",
          revokedAt: null,
          secretHash: "sha256:secret",
          status: "active",
          updatedAt: new Date(),
          websiteEnvironmentId: "environment_staging",
          websiteId: "site_1",
          environment: {
            createdAt: new Date(),
            id: "environment_staging",
            name: "Staging",
            organizationId: "org_1",
            status: "active",
            type: "staging",
            updatedAt: new Date(),
            websiteId: "site_1",
          },
        },
      ],
    });

    const result = await listWebsiteCredentials({
      database,
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(result.credentials[0]).toMatchObject({ publicKey: "spk_public" });
    expect(result.credentials[0]).not.toHaveProperty("secret");
    expect(result.credentials[0]).not.toHaveProperty("secretHash");
  });

  it("rejects credential creation for unsupported website types", async () => {
    await expect(
      createWebsiteCredential({
        database: createDatabase({ websiteType: "wordpress" }).database,
        input: { environmentId: "environment_staging", label: "Production" },
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(WebsiteCredentialError);

    await expect(
      createWebsiteCredential({
        database: createDatabase({ websiteType: "external_legacy" }).database,
        input: { environmentId: "environment_staging", label: "Production" },
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(WebsiteCredentialError);
  });

  it("allows multiple credentials for one website with unique public keys", async () => {
    const { database, state } = createDatabase();

    await createWebsiteCredential({
      database,
      input: { environmentId: "environment_staging", label: "Production" },
      request: createRequest(),
      websiteId: "site_1",
    });
    await createWebsiteCredential({
      database,
      input: { environmentId: "environment_staging", label: "Staging" },
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(state.credentials).toHaveLength(2);
    expect(new Set(state.credentials.map((credential) => credential.publicKey)).size).toBe(2);
  });

  it("enforces permission and tenant access", async () => {
    await expect(
      createWebsiteCredential({
        database: createDatabase().database,
        input: { environmentId: "environment_staging", label: "Production" },
        request: createRequest([]),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(PermissionDeniedError);

    await expect(
      listWebsiteCredentials({
        database: createDatabase({ organizationId: "org_2" }).database,
        request: createRequest(),
        websiteId: "site_1",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("revokes credentials idempotently and writes audit metadata without secrets", async () => {
    const { database, state } = createDatabase();
    const created = await createWebsiteCredential({
      database,
      input: { environmentId: "environment_staging", label: "Production" },
      request: createRequest(),
      websiteId: "site_1",
    });

    await revokeWebsiteCredential({
      credentialId: created.credential.id,
      database,
      request: createRequest(),
      websiteId: "site_1",
    });
    await revokeWebsiteCredential({
      credentialId: created.credential.id,
      database,
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(state.credentials[0]?.status).toBe("revoked");
    expect(JSON.stringify(state.auditLogs)).not.toContain(created.secret);
    expect(JSON.stringify(state.auditLogs)).not.toContain(state.credentials[0]?.secretHash);
  });

  it("rotates by revoking the old credential and creating a new one", async () => {
    const { database, state } = createDatabase();
    const created = await createWebsiteCredential({
      database,
      input: { environmentId: "environment_staging", label: "Production" },
      request: createRequest(),
      websiteId: "site_1",
    });
    const oldSecret = created.secret;

    const rotated = await rotateWebsiteCredential({
      credentialId: created.credential.id,
      database,
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(rotated.secret).not.toBe(oldSecret);
    expect(state.credentials[0]?.status).toBe("revoked");
    expect(state.credentials[1]?.status).toBe("active");

    await expect(
      authenticateWebsiteCredential({
        database,
        publicKey: created.credential.publicKey,
        secret: oldSecret,
      }),
    ).rejects.toThrow();
  });

  it("creates audit events for create, rotate, and revoke", async () => {
    const { database, state } = createDatabase();
    const created = await createWebsiteCredential({
      database,
      input: { environmentId: "environment_staging", label: "Production" },
      request: createRequest(),
      websiteId: "site_1",
    });
    const rotated = await rotateWebsiteCredential({
      credentialId: created.credential.id,
      database,
      request: createRequest(),
      websiteId: "site_1",
    });
    await revokeWebsiteCredential({
      credentialId: rotated.credential.id,
      database,
      request: createRequest(),
      websiteId: "site_1",
    });

    expect(state.auditLogs.map((log) => log.action)).toEqual([
      "website_credential.created",
      "website_credential.rotated",
      "website_credential.revoked",
    ]);
  });
});
