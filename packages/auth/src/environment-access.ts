import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateEnvironmentAccessSecret(byteLength = 32): string {
  return `env_${randomBytes(byteLength).toString("base64url")}`;
}

export function hashEnvironmentAccessSecret(secret: string): string {
  return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
}

export function verifyEnvironmentAccessSecret({
  hash,
  secret,
}: {
  hash: string;
  secret: string;
}): boolean {
  const providedHash = hashEnvironmentAccessSecret(secret);
  const expected = Buffer.from(hash);
  const provided = Buffer.from(providedHash);

  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
