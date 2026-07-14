import { and, eq, isNull } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import { websiteModules, websites } from "@agency/database/schema";
import { isKnownModuleKey, type ModuleKey } from "@agency/lib/modules";
import type { PlatformRequestContext } from "./auth";
import { PlatformApiError } from "./errors";

type Database = ReturnType<typeof createDatabaseClient>;

export async function requireEnabledModule({
  context,
  database,
  moduleKey,
}: {
  context: PlatformRequestContext;
  database: Database;
  moduleKey: string;
}): Promise<ModuleKey> {
  if (!isKnownModuleKey(moduleKey)) {
    throw new PlatformApiError({ code: "MODULE_NOT_ENABLED" });
  }

  const website = await database.query.websites.findFirst({
    where: and(
      eq(websites.id, context.websiteId),
      eq(websites.organizationId, context.organizationId),
      isNull(websites.deletedAt),
    ),
    columns: {
      id: true,
      organizationId: true,
      websiteType: true,
    },
  });

  if (website?.websiteType !== "sharoz_connected") {
    throw new PlatformApiError({ code: "MODULE_NOT_ENABLED" });
  }

  const moduleRecord = await database.query.websiteModules.findFirst({
    where: and(
      eq(websiteModules.organizationId, context.organizationId),
      eq(websiteModules.websiteId, context.websiteId),
      eq(websiteModules.moduleKey, moduleKey),
      eq(websiteModules.enabled, true),
    ),
    columns: { id: true },
  });

  if (!moduleRecord) {
    throw new PlatformApiError({ code: "MODULE_NOT_ENABLED" });
  }

  return moduleKey;
}
