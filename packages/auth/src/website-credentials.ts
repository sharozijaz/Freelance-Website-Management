import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import { websiteApiCredentials } from "@agency/database/schema";

type Database = ReturnType<typeof createDatabaseClient>;

export interface WebsiteCredentialPair {
  publicKey: string;
  secret: string;
}

export interface WebsitePrincipal {
  credentialId: string;
  credentialLabel: string;
  environmentId: string;
  environmentType: "production" | "staging";
  organizationId: string;
  websiteId: string;
}

export class WebsiteCredentialAuthenticationError extends Error {
  constructor() {
    super("Invalid website credentials.");
    this.name = "WebsiteCredentialAuthenticationError";
  }
}

export function generateCredentialToken(prefix: "spk" | "sps", byteLength = 32): string {
  return `${prefix}_${randomBytes(byteLength).toString("base64url")}`;
}

export function createWebsiteCredentialPair(): WebsiteCredentialPair {
  return {
    publicKey: generateCredentialToken("spk", 24),
    secret: generateCredentialToken("sps", 32),
  };
}

export function isWebsiteCredentialPublicKey(value: string): boolean {
  return /^spk_[A-Za-z0-9_-]{32,}$/.test(value);
}

export function isWebsiteCredentialSecret(value: string): boolean {
  return /^sps_[A-Za-z0-9_-]{43,}$/.test(value);
}

export function hashWebsiteCredentialSecret(secret: string): string {
  return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
}

export function verifyWebsiteCredentialSecret({
  hash,
  secret,
}: {
  hash: string;
  secret: string;
}): boolean {
  const providedHash = hashWebsiteCredentialSecret(secret);
  const expected = Buffer.from(hash);
  const provided = Buffer.from(providedHash);

  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function authenticateWebsiteCredential({
  database,
  now = new Date(),
  publicKey,
  secret,
  updateLastUsed = true,
}: {
  database: Database;
  now?: Date;
  publicKey: string;
  secret: string;
  updateLastUsed?: boolean;
}): Promise<WebsitePrincipal> {
  const credential = await database.query.websiteApiCredentials.findFirst({
    where: and(
      eq(websiteApiCredentials.publicKey, publicKey),
      eq(websiteApiCredentials.status, "active"),
    ),
    with: { environment: true, website: true },
  });

  if (!credential) {
    throw new WebsiteCredentialAuthenticationError();
  }

  if (
    credential.revokedAt ||
    credential.status !== "active" ||
    (credential.expiresAt && credential.expiresAt <= now) ||
    credential.website.deletedAt ||
    credential.website.websiteType !== "sharoz_connected" ||
    credential.website.organizationId !== credential.organizationId ||
    credential.websiteId !== credential.website.id ||
    credential.environment.organizationId !== credential.organizationId ||
    credential.environment.websiteId !== credential.websiteId ||
    credential.environment.status !== "active"
  ) {
    throw new WebsiteCredentialAuthenticationError();
  }

  if (!verifyWebsiteCredentialSecret({ hash: credential.secretHash, secret })) {
    throw new WebsiteCredentialAuthenticationError();
  }

  const principal = {
    credentialId: credential.id,
    credentialLabel: credential.label,
    environmentId: credential.websiteEnvironmentId,
    environmentType: credential.environment.type,
    organizationId: credential.organizationId,
    websiteId: credential.websiteId,
  } satisfies WebsitePrincipal;

  if (updateLastUsed) {
    await database
      .update(websiteApiCredentials)
      .set({ lastUsedAt: now, updatedAt: now })
      .where(
        and(
          eq(websiteApiCredentials.id, credential.id),
          eq(websiteApiCredentials.status, "active"),
          isNull(websiteApiCredentials.revokedAt),
        ),
      );
  }

  return principal;
}
