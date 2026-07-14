import { createHash, timingSafeEqual } from "node:crypto";

export const previewCookieName = "sharoz_preview";
export const stagingAccessCookieName = "sharoz_staging_access";

export type AccessKind = "preview" | "staging";

export function hashAccessSecret(secret: string): string {
  return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
}

export function verifyAccessSecret({
  expectedHash,
  providedSecret,
}: {
  expectedHash: string | null;
  providedSecret: string | null;
}) {
  if (!expectedHash || !providedSecret) {
    return false;
  }

  const providedHash = hashAccessSecret(providedSecret);
  const expected = Buffer.from(expectedHash);
  const provided = Buffer.from(providedHash);

  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function createSessionValue({ hash, kind }: { hash: string; kind: AccessKind }) {
  return createHash("sha256").update(`${kind}:${hash}`).digest("hex");
}

export function isValidSessionValue({
  hash,
  kind,
  value,
}: {
  hash: string | null;
  kind: AccessKind;
  value: string | null;
}) {
  if (!hash || !value) {
    return false;
  }

  return value === createSessionValue({ hash, kind });
}

export function safeRedirectPath(value: string | null, fallback = "/blog") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://example.com");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
