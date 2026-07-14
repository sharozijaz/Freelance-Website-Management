import "server-only";

import { cookies } from "next/headers";
import {
  createSessionValue,
  hashAccessSecret,
  isValidSessionValue,
  previewCookieName,
  stagingAccessCookieName,
  type AccessKind,
} from "./access-core";

const previewEnvNames = {
  hash: "SHAROZ_PREVIEW_ACCESS_TOKEN_HASH",
  secret: "SHAROZ_PREVIEW_ACCESS_TOKEN",
} as const;

const stagingEnvNames = {
  hash: "SHAROZ_STAGING_ACCESS_SECRET_HASH",
  secret: "SHAROZ_STAGING_ACCESS_SECRET",
} as const;

function configuredHash(kind: AccessKind) {
  const names = kind === "preview" ? previewEnvNames : stagingEnvNames;
  const explicitHash = process.env[names.hash]?.trim();

  if (explicitHash) {
    return explicitHash;
  }

  const localSecret = process.env[names.secret]?.trim();
  if (!localSecret) {
    return null;
  }

  return hashAccessSecret(localSecret);
}

function cookieName(kind: AccessKind) {
  return kind === "preview" ? previewCookieName : stagingAccessCookieName;
}

export function isStagingAccessProtectionEnabled() {
  return process.env.SHAROZ_STAGING_ACCESS_ENABLED === "true";
}

export async function hasAccessSession(kind: AccessKind) {
  const hash = configuredHash(kind);
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName(kind))?.value ?? null;

  return isValidSessionValue({ hash, kind, value });
}

export async function hasPreviewSession() {
  return hasAccessSession("preview");
}

export function sessionCookieValue(kind: AccessKind) {
  const hash = configuredHash(kind);

  return hash ? createSessionValue({ hash, kind }) : null;
}

export function accessCookieName(kind: AccessKind) {
  return cookieName(kind);
}
