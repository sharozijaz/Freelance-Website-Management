import { describe, expect, it } from "vitest";
import { websiteApiCredentials } from "@agency/database/schema";
import {
  authenticateWebsiteCredential,
  createWebsiteCredentialPair,
  hashWebsiteCredentialSecret,
  isWebsiteCredentialPublicKey,
  isWebsiteCredentialSecret,
  verifyWebsiteCredentialSecret,
  WebsiteCredentialAuthenticationError,
} from "./website-credentials";

function createDatabase({
  expiresAt = null,
  organizationId = "org_1",
  publicKey,
  revokedAt = null,
  secret,
  status = "active",
  websiteOrganizationId = "org_1",
  websiteType = "sharoz_connected",
  environmentOrganizationId = "org_1",
  environmentStatus = "active",
  environmentWebsiteId = "site_1",
}: {
  environmentOrganizationId?: string;
  environmentStatus?: "active" | "inactive";
  environmentWebsiteId?: string;
  expiresAt?: Date | null;
  organizationId?: string;
  publicKey: string;
  revokedAt?: Date | null;
  secret: string;
  status?: "active" | "revoked";
  websiteOrganizationId?: string;
  websiteType?: "external_legacy" | "sharoz_connected" | "wordpress";
}) {
  const state = {
    lastUsedAt: null as Date | null,
  };
  const credential = {
    environment: {
      id: "environment_1",
      organizationId: environmentOrganizationId,
      status: environmentStatus,
      type: "staging",
      websiteId: environmentWebsiteId,
    },
    expiresAt,
    id: "credential_1",
    label: "Production",
    organizationId,
    publicKey,
    revokedAt,
    secretHash: hashWebsiteCredentialSecret(secret),
    status,
    website: {
      deletedAt: null,
      id: "site_1",
      organizationId: websiteOrganizationId,
      websiteType,
    },
    websiteId: "site_1",
    websiteEnvironmentId: "environment_1",
  };

  const database = {
    query: {
      websiteApiCredentials: {
        findFirst: () => Promise.resolve(status === "active" ? credential : null),
      },
    },
    update(table: unknown) {
      return {
        set(value: { lastUsedAt?: Date }) {
          return {
            where: () => {
              if (table === websiteApiCredentials && value.lastUsedAt) {
                state.lastUsedAt = value.lastUsedAt;
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

describe("website credential format and hashing", () => {
  it("generates explicit public and secret credential formats", () => {
    const pair = createWebsiteCredentialPair();

    expect(pair.publicKey).toMatch(/^spk_/);
    expect(pair.secret).toMatch(/^sps_/);
    expect(isWebsiteCredentialPublicKey(pair.publicKey)).toBe(true);
    expect(isWebsiteCredentialSecret(pair.secret)).toBe(true);
  });

  it("hashes secrets without storing plaintext", () => {
    const pair = createWebsiteCredentialPair();
    const hash = hashWebsiteCredentialSecret(pair.secret);

    expect(hash).toMatch(/^sha256:/);
    expect(hash).not.toContain(pair.secret);
    expect(verifyWebsiteCredentialSecret({ hash, secret: pair.secret })).toBe(true);
    expect(verifyWebsiteCredentialSecret({ hash, secret: "sps_wrong" })).toBe(false);
  });
});

describe("website credential authentication", () => {
  it("authenticates valid active Sharoz Connected credentials", async () => {
    const pair = createWebsiteCredentialPair();
    const { database } = createDatabase(pair);

    await expect(
      authenticateWebsiteCredential({
        database,
        publicKey: pair.publicKey,
        secret: pair.secret,
      }),
    ).resolves.toMatchObject({
      credentialId: "credential_1",
      credentialLabel: "Production",
      environmentId: "environment_1",
      environmentType: "staging",
      organizationId: "org_1",
      websiteId: "site_1",
    });
  });

  it("rejects invalid and unknown credentials with the same generic error", async () => {
    const pair = createWebsiteCredentialPair();
    const { database } = createDatabase(pair);

    await expect(
      authenticateWebsiteCredential({
        database,
        publicKey: pair.publicKey,
        secret: "sps_wrong",
      }),
    ).rejects.toThrow(WebsiteCredentialAuthenticationError);
  });

  it("rejects revoked, expired, wrong-tenant, and unsupported website credentials", async () => {
    const pair = createWebsiteCredentialPair();

    await expect(
      authenticateWebsiteCredential({
        database: createDatabase({ ...pair, status: "revoked" }).database,
        publicKey: pair.publicKey,
        secret: pair.secret,
      }),
    ).rejects.toThrow(WebsiteCredentialAuthenticationError);

    await expect(
      authenticateWebsiteCredential({
        database: createDatabase({ ...pair, expiresAt: new Date(Date.now() - 1000) }).database,
        publicKey: pair.publicKey,
        secret: pair.secret,
      }),
    ).rejects.toThrow(WebsiteCredentialAuthenticationError);

    await expect(
      authenticateWebsiteCredential({
        database: createDatabase({ ...pair, websiteOrganizationId: "org_2" }).database,
        publicKey: pair.publicKey,
        secret: pair.secret,
      }),
    ).rejects.toThrow(WebsiteCredentialAuthenticationError);

    await expect(
      authenticateWebsiteCredential({
        database: createDatabase({ ...pair, websiteType: "wordpress" }).database,
        publicKey: pair.publicKey,
        secret: pair.secret,
      }),
    ).rejects.toThrow(WebsiteCredentialAuthenticationError);

    await expect(
      authenticateWebsiteCredential({
        database: createDatabase({ ...pair, environmentStatus: "inactive" }).database,
        publicKey: pair.publicKey,
        secret: pair.secret,
      }),
    ).rejects.toThrow(WebsiteCredentialAuthenticationError);

    await expect(
      authenticateWebsiteCredential({
        database: createDatabase({ ...pair, environmentWebsiteId: "site_2" }).database,
        publicKey: pair.publicKey,
        secret: pair.secret,
      }),
    ).rejects.toThrow(WebsiteCredentialAuthenticationError);
  });

  it("tracks last successful use after validation", async () => {
    const pair = createWebsiteCredentialPair();
    const { database, state } = createDatabase(pair);
    const now = new Date("2026-07-13T00:00:00.000Z");

    await authenticateWebsiteCredential({
      database,
      now,
      publicKey: pair.publicKey,
      secret: pair.secret,
    });

    expect(state.lastUsedAt).toEqual(now);
  });
});
