import {
  authenticateWebsiteCredential,
  isWebsiteCredentialPublicKey,
  isWebsiteCredentialSecret,
  WebsiteCredentialAuthenticationError,
  type WebsitePrincipal,
} from "@agency/auth/website-credentials";
import type { createDatabaseClient } from "@agency/database";
import { PlatformApiError } from "./errors";

type Database = ReturnType<typeof createDatabaseClient>;

export type PlatformRequestContext = WebsitePrincipal;

const bearerPattern = /^Bearer\s+(.+)$/;

export function parsePlatformAuthorizationHeader(value: string | null): {
  publicKey: string;
  secret: string;
} {
  if (!value) {
    throw new PlatformApiError({ code: "UNAUTHORIZED" });
  }

  const match = bearerPattern.exec(value);

  if (!match?.[1]) {
    throw new PlatformApiError({ code: "UNAUTHORIZED" });
  }

  const [publicKey, secret, extra] = match[1].split(".");

  if (
    extra !== undefined ||
    !publicKey ||
    !secret ||
    !isWebsiteCredentialPublicKey(publicKey) ||
    !isWebsiteCredentialSecret(secret)
  ) {
    throw new PlatformApiError({ code: "UNAUTHORIZED" });
  }

  return { publicKey, secret };
}

export async function authenticatePlatformRequest({
  database,
  request,
}: {
  database: Database;
  request: Pick<Request, "headers">;
}): Promise<PlatformRequestContext> {
  const { publicKey, secret } = parsePlatformAuthorizationHeader(
    request.headers.get("authorization"),
  );

  try {
    return await authenticateWebsiteCredential({ database, publicKey, secret });
  } catch (error) {
    if (error instanceof WebsiteCredentialAuthenticationError) {
      throw new PlatformApiError({ code: "UNAUTHORIZED" });
    }

    throw error;
  }
}
