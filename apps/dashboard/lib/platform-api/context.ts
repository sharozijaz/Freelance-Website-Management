import { and, eq, isNull } from "drizzle-orm";
import type { PlatformContextResponse } from "@sharoz/contracts";
import type { createDatabaseClient } from "@agency/database";
import { websiteEnvironments, websiteModules, websites } from "@agency/database/schema";
import type { PlatformRequestContext } from "./auth";
import { PlatformApiError } from "./errors";

type Database = ReturnType<typeof createDatabaseClient>;

export async function getPlatformContext({
  context,
  database,
}: {
  context: PlatformRequestContext;
  database: Database;
}): Promise<PlatformContextResponse> {
  const website = await database.query.websites.findFirst({
    where: and(
      eq(websites.id, context.websiteId),
      eq(websites.organizationId, context.organizationId),
      isNull(websites.deletedAt),
    ),
    columns: {
      id: true,
      name: true,
      organizationId: true,
      websiteType: true,
    },
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (website?.websiteType !== "sharoz_connected") {
    throw new PlatformApiError({ code: "NOT_FOUND" });
  }

  const enabledModuleRows = await database.query.websiteModules.findMany({
    where: and(
      eq(websiteModules.organizationId, context.organizationId),
      eq(websiteModules.websiteId, context.websiteId),
      eq(websiteModules.enabled, true),
    ),
    columns: { moduleKey: true },
  });

  const environment = await database.query.websiteEnvironments.findFirst({
    where: and(
      eq(websiteEnvironments.id, context.environmentId),
      eq(websiteEnvironments.organizationId, context.organizationId),
      eq(websiteEnvironments.websiteId, context.websiteId),
    ),
    columns: {
      baseUrl: true,
      id: true,
      name: true,
      type: true,
    },
  });

  if (!environment) {
    throw new PlatformApiError({ code: "NOT_FOUND" });
  }

  return {
    credential: {
      id: context.credentialId,
      label: context.credentialLabel,
    },
    enabledModules: enabledModuleRows.map((row) => row.moduleKey),
    environment,
    organization: {
      id: website.organization.id,
      name: website.organization.name,
    },
    website: {
      id: website.id,
      name: website.name,
      type: website.websiteType,
    },
  };
}
