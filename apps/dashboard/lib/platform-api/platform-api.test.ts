import { describe, expect, it } from "vitest";
import { hashWebsiteCredentialSecret } from "@agency/auth/website-credentials";
import type { ModuleKey, WebsiteType } from "@agency/lib/modules";
import { authenticatePlatformRequest, parsePlatformAuthorizationHeader } from "./auth";
import { getPlatformContext } from "./context";
import { getPlatformContextResponse } from "./context-route";
import { PlatformApiError } from "./errors";
import { requireEnabledModule } from "./modules";

const publicKey = `spk_${"a".repeat(32)}`;
const secret = `sps_${"b".repeat(43)}`;

interface WebsiteRow {
  deletedAt: Date | null;
  id: string;
  name: string;
  organization: { id: string; name: string };
  organizationId: string;
  websiteType: WebsiteType;
}

interface CredentialRow {
  environment: EnvironmentRow;
  expiresAt: Date | null;
  id: string;
  label: string;
  organizationId: string;
  publicKey: string;
  revokedAt: Date | null;
  secretHash: string;
  status: "active" | "revoked";
  website: WebsiteRow;
  websiteId: string;
  websiteEnvironmentId: string;
}

interface EnvironmentRow {
  baseUrl: string | null;
  id: string;
  name: string;
  organizationId: string;
  status: "active" | "inactive";
  type: "production" | "staging";
  websiteId: string;
}

interface ModuleRow {
  enabled: boolean;
  moduleKey: ModuleKey;
  organizationId: string;
  websiteId: string;
}

function createRequest(
  authorization?: string,
  url = "https://dashboard.test/api/platform/v1/context",
) {
  return new Request(url, {
    headers: authorization ? { Authorization: authorization } : {},
  });
}

function createDatabase({
  credential,
  modules = [],
  website,
}: {
  credential?: Partial<CredentialRow>;
  modules?: ModuleRow[];
  website?: Partial<WebsiteRow>;
} = {}) {
  const websiteRow: WebsiteRow = {
    deletedAt: null,
    id: "website_a",
    name: "Website A",
    organization: { id: "org_a", name: "Org A" },
    organizationId: "org_a",
    websiteType: "sharoz_connected",
    ...website,
  };
  const credentialRow: CredentialRow = {
    environment: {
      baseUrl: "https://staging.example.com",
      id: "environment_staging",
      name: "Staging",
      organizationId: websiteRow.organizationId,
      status: "active",
      type: "staging",
      websiteId: websiteRow.id,
    },
    expiresAt: null,
    id: "credential_a",
    label: "Production",
    organizationId: websiteRow.organizationId,
    publicKey,
    revokedAt: null,
    secretHash: hashWebsiteCredentialSecret(secret),
    status: "active",
    website: websiteRow,
    websiteId: websiteRow.id,
    websiteEnvironmentId: "environment_staging",
    ...credential,
  };
  const state = { lastUsedUpdates: 0 };

  const database = {
    query: {
      websiteApiCredentials: {
        findFirst: () =>
          credentialRow.status === "active" && credentialRow.publicKey === publicKey
            ? credentialRow
            : null,
      },
      websiteEnvironments: {
        findFirst: () =>
          credentialRow.environment.organizationId === credentialRow.organizationId &&
          credentialRow.environment.websiteId === credentialRow.websiteId &&
          credentialRow.environment.id === credentialRow.websiteEnvironmentId
            ? credentialRow.environment
            : null,
      },
      websiteModules: {
        findFirst: () =>
          modules.find(
            (module) =>
              module.organizationId === websiteRow.organizationId &&
              module.websiteId === websiteRow.id &&
              module.enabled,
          ) ?? null,
        findMany: () =>
          modules.filter(
            (module) =>
              module.organizationId === websiteRow.organizationId &&
              module.websiteId === websiteRow.id &&
              module.enabled,
          ),
      },
      websites: {
        findFirst: () =>
          websiteRow.id === credentialRow.websiteId &&
          websiteRow.organizationId === credentialRow.organizationId
            ? websiteRow
            : null,
      },
    },
    update: () => ({
      set: () => ({
        where: () => {
          state.lastUsedUpdates += 1;
          return Promise.resolve();
        },
      }),
    }),
  };

  return { database: database as never, state, website: websiteRow };
}

describe("Platform API credential authentication", () => {
  it("rejects missing and malformed Authorization headers", () => {
    expect(() => parsePlatformAuthorizationHeader(null)).toThrow(PlatformApiError);
    expect(() => parsePlatformAuthorizationHeader(`${publicKey}.${secret}`)).toThrow(
      PlatformApiError,
    );
    expect(() => parsePlatformAuthorizationHeader(`Basic ${publicKey}.${secret}`)).toThrow(
      PlatformApiError,
    );
    expect(() => parsePlatformAuthorizationHeader("Bearer malformed")).toThrow(PlatformApiError);
  });

  it("authenticates a website credential and derives the website principal", async () => {
    const { database, state } = createDatabase();
    const context = await authenticatePlatformRequest({
      database,
      request: createRequest(`Bearer ${publicKey}.${secret}`),
    });

    expect(context).toEqual({
      credentialId: "credential_a",
      credentialLabel: "Production",
      environmentId: "environment_staging",
      environmentType: "staging",
      organizationId: "org_a",
      websiteId: "website_a",
    });
    expect(state.lastUsedUpdates).toBe(1);
  });

  it("returns generic unauthorized errors for invalid credential causes", async () => {
    const invalidStates = [
      createDatabase({ credential: { publicKey: "spk_unknown" } }),
      createDatabase({ credential: { secretHash: hashWebsiteCredentialSecret("sps_wrong") } }),
      createDatabase({ credential: { revokedAt: new Date(), status: "revoked" } }),
      createDatabase({ credential: { expiresAt: new Date("2020-01-01") } }),
      createDatabase({ website: { websiteType: "wordpress" } }),
    ];

    for (const { database } of invalidStates) {
      await expect(
        authenticatePlatformRequest({
          database,
          request: createRequest(`Bearer ${publicKey}.${secret}`),
        }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }
  });

  it("does not let request-supplied tenant IDs replace credential tenant identity", async () => {
    const { database } = createDatabase({
      modules: [
        { enabled: true, moduleKey: "blog", organizationId: "org_a", websiteId: "website_a" },
      ],
    });
    const request = createRequest(
      `Bearer ${publicKey}.${secret}`,
      "https://dashboard.test/api/platform/v1/context?organizationId=org_b&websiteId=website_b",
    );
    const context = await authenticatePlatformRequest({ database, request });
    const response = await getPlatformContext({ context, database });

    expect(response.organization.id).toBe("org_a");
    expect(response.website.id).toBe("website_a");
    expect(JSON.stringify(response)).not.toContain(secret);
    expect(JSON.stringify(response)).not.toContain("secretHash");
  });
});

describe("Platform API module authorization", () => {
  it("allows authenticated websites with an enabled module", async () => {
    const { database } = createDatabase({
      modules: [
        { enabled: true, moduleKey: "blog", organizationId: "org_a", websiteId: "website_a" },
      ],
    });

    await expect(
      requireEnabledModule({
        context: {
          credentialId: "credential_a",
          credentialLabel: "Production",
          environmentId: "environment_staging",
          environmentType: "staging",
          organizationId: "org_a",
          websiteId: "website_a",
        },
        database,
        moduleKey: "blog",
      }),
    ).resolves.toBe("blog");
  });

  it("rejects disabled, unknown, and cross-tenant module access", async () => {
    const cases = [
      { moduleKey: "blog", modules: [] },
      { moduleKey: "unknown", modules: [] },
      {
        moduleKey: "blog",
        modules: [
          { enabled: true, moduleKey: "blog", organizationId: "org_b", websiteId: "website_b" },
        ],
      },
      {
        moduleKey: "blog",
        modules: [
          { enabled: false, moduleKey: "blog", organizationId: "org_a", websiteId: "website_a" },
        ],
      },
    ];

    for (const testCase of cases) {
      const { database } = createDatabase({ modules: testCase.modules as ModuleRow[] });

      await expect(
        requireEnabledModule({
          context: {
            credentialId: "credential_a",
            credentialLabel: "Production",
            environmentId: "environment_staging",
            environmentType: "staging",
            organizationId: "org_a",
            websiteId: "website_a",
          },
          database,
          moduleKey: testCase.moduleKey,
        }),
      ).rejects.toMatchObject({
        code: "MODULE_NOT_ENABLED",
      });
    }
  });
});

describe("Platform API context route", () => {
  it("returns the shared data envelope without credential secrets", async () => {
    const { database } = createDatabase({
      modules: [
        { enabled: true, moduleKey: "blog", organizationId: "org_a", websiteId: "website_a" },
        { enabled: true, moduleKey: "forms", organizationId: "org_a", websiteId: "website_a" },
      ],
    });
    const response = await getPlatformContextResponse({
      database,
      request: createRequest(`Bearer ${publicKey}.${secret}`),
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        credential: { id: "credential_a", label: "Production" },
        enabledModules: ["blog", "forms"],
        environment: {
          baseUrl: "https://staging.example.com",
          id: "environment_staging",
          name: "Staging",
          type: "staging",
        },
        organization: { id: "org_a", name: "Org A" },
        website: { id: "website_a", name: "Website A", type: "sharoz_connected" },
      },
    });
    expect(JSON.stringify(body)).not.toContain(secret);
    expect(JSON.stringify(body)).not.toContain("secretHash");
  });

  it("returns the stable unauthorized error contract", async () => {
    const { database } = createDatabase();
    const response = await getPlatformContextResponse({
      database,
      request: createRequest(),
    });

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      },
    });
    expect(response.status).toBe(401);
  });
});
