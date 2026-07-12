import { and, eq, isNull } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import { domains, websites } from "@agency/database/schema";

type Database = ReturnType<typeof createDatabaseClient>;

export interface TenantContext {
  hostname: string;
  organizationId: string | null;
  websiteId: string | null;
}

function resolveConfiguredHostname(value?: string): string {
  if (!value) {
    return "localhost";
  }

  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export function resolveTenant(): TenantContext {
  const websiteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_WEBSITE_URL;

  return {
    hostname: resolveConfiguredHostname(websiteUrl),
    organizationId: process.env.WEB_ORGANIZATION_ID ?? null,
    websiteId: process.env.WEB_WEBSITE_ID ?? null,
  };
}

export function normalizeRequestHostname(value: string) {
  return value.trim().toLowerCase().replace(/:\d+$/, "");
}

export async function resolveTenantByHostname({
  database,
  hostname,
}: {
  database: Database;
  hostname: string;
}): Promise<TenantContext> {
  const normalizedHostname = normalizeRequestHostname(hostname);
  const domain = await database.query.domains.findFirst({
    where: and(eq(domains.domain, normalizedHostname), isNull(domains.deletedAt)),
    with: { website: true },
  });

  if (domain?.website && !domain.website.deletedAt) {
    return {
      hostname: normalizedHostname,
      organizationId: domain.organizationId,
      websiteId: domain.websiteId,
    };
  }

  const website = await database.query.websites.findFirst({
    where: and(eq(websites.primaryDomain, normalizedHostname), isNull(websites.deletedAt)),
  });

  return {
    hostname: normalizedHostname,
    organizationId: website?.organizationId ?? null,
    websiteId: website?.id ?? null,
  };
}
