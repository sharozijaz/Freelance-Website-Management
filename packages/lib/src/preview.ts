import { createHmac, timingSafeEqual } from "node:crypto";

export interface PreviewTokenPayload {
  exp: number;
  organizationId: string;
  path: string;
}

export interface CreatePreviewTokenInput {
  organizationId: string;
  path: string;
  secret: string;
  ttlSeconds?: number;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function isPreviewPayload(value: unknown): value is PreviewTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.exp === "number" &&
    typeof payload.organizationId === "string" &&
    typeof payload.path === "string" &&
    payload.path.startsWith("/")
  );
}

export function createPreviewToken({
  organizationId,
  path,
  secret,
  ttlSeconds = 900,
}: CreatePreviewTokenInput): string {
  const payload = encode({
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    organizationId,
    path: path.startsWith("/") ? path : `/${path}`,
  });
  const signature = sign(payload, secret);

  return `${payload}.${signature}`;
}

export function verifyPreviewToken(token: string, secret: string): PreviewTokenPayload | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload, secret);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  const decoded = decode(payload);

  if (!isPreviewPayload(decoded)) {
    return null;
  }

  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return decoded;
}
