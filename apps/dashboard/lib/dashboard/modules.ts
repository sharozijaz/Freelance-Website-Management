import { and, eq } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import { auditLogs, websiteModules } from "@agency/database/schema";
import {
  getDependentModuleKeys,
  getModuleDependencies,
  isKnownModuleKey,
  listModuleDefinitions,
} from "@agency/lib/modules";
import type { ModuleKey, WebsiteType } from "@agency/lib/modules";
import { requireWebsiteAccess } from "./projects";
import type { DashboardRequest } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

export class ModuleEnablementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleEnablementError";
  }
}

export interface WebsiteModuleState {
  description: string;
  enabled: boolean;
  key: ModuleKey;
  label: string;
}

export function parseModuleKey(value: string | null | undefined): ModuleKey {
  if (!value || !isKnownModuleKey(value)) {
    throw new ModuleEnablementError("Unknown website module.");
  }

  return value;
}

function assertSharozConnectedWebsite(website: { websiteType: string }) {
  if (website.websiteType !== "sharoz_connected") {
    throw new ModuleEnablementError(
      "Business modules can only be enabled for Sharoz Connected websites in this milestone.",
    );
  }
}

async function writeModuleAudit({
  action,
  database,
  moduleKey,
  organizationId,
  request,
  websiteId,
}: {
  action: "website_module.enabled" | "website_module.disabled";
  database: Database;
  moduleKey: ModuleKey;
  organizationId: string;
  request: DashboardRequest;
  websiteId: string;
}) {
  await database.insert(auditLogs).values({
    action,
    actorUserId: request.context.user.id,
    metadata: { moduleKey, websiteId },
    organizationId,
    resourceId: websiteId,
    resourceType: "website",
  });
}

async function getEnabledModuleKeySet({
  database,
  organizationId,
  websiteId,
}: {
  database: Database;
  organizationId: string;
  websiteId: string;
}) {
  const rows = await database.query.websiteModules.findMany({
    where: and(
      eq(websiteModules.organizationId, organizationId),
      eq(websiteModules.websiteId, websiteId),
      eq(websiteModules.enabled, true),
    ),
    columns: { moduleKey: true },
  });

  return new Set(rows.map((row) => row.moduleKey));
}

export async function listWebsiteModules({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}): Promise<{ modules: WebsiteModuleState[]; websiteType: WebsiteType }> {
  const website = await requireWebsiteAccess({
    database,
    permission: "modules:read",
    request,
    websiteId,
  });
  const enabledModules = await getEnabledModuleKeySet({
    database,
    organizationId: website.organizationId,
    websiteId: website.id,
  });

  return {
    modules: listModuleDefinitions().map((definition) => ({
      ...definition,
      enabled: enabledModules.has(definition.key),
    })),
    websiteType: website.websiteType,
  };
}

export async function isWebsiteModuleEnabled({
  database,
  moduleKey,
  request,
  websiteId,
}: {
  database: Database;
  moduleKey: ModuleKey;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "modules:read",
    request,
    websiteId,
  });
  const existing = await database.query.websiteModules.findFirst({
    where: and(
      eq(websiteModules.organizationId, website.organizationId),
      eq(websiteModules.websiteId, website.id),
      eq(websiteModules.moduleKey, moduleKey),
      eq(websiteModules.enabled, true),
    ),
    columns: { id: true },
  });

  return Boolean(existing);
}

export async function enableWebsiteModule({
  database,
  moduleKey,
  request,
  websiteId,
}: {
  database: Database;
  moduleKey: ModuleKey;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "modules:manage",
    request,
    websiteId,
  });
  assertSharozConnectedWebsite(website);

  const enabledModules = await getEnabledModuleKeySet({
    database,
    organizationId: website.organizationId,
    websiteId: website.id,
  });
  const missingDependencies = getModuleDependencies(moduleKey).filter(
    (dependency) => !enabledModules.has(dependency),
  );

  if (missingDependencies.length > 0) {
    throw new ModuleEnablementError("Orders requires Catalog and Customers.");
  }

  const now = new Date();
  const existing = await database.query.websiteModules.findFirst({
    where: and(
      eq(websiteModules.organizationId, website.organizationId),
      eq(websiteModules.websiteId, website.id),
      eq(websiteModules.moduleKey, moduleKey),
    ),
  });

  if (existing) {
    await database
      .update(websiteModules)
      .set({ enabled: true, updatedAt: now })
      .where(eq(websiteModules.id, existing.id));
  } else {
    await database.insert(websiteModules).values({
      enabled: true,
      moduleKey,
      organizationId: website.organizationId,
      websiteId: website.id,
    });
  }

  await writeModuleAudit({
    action: "website_module.enabled",
    database,
    moduleKey,
    organizationId: website.organizationId,
    request,
    websiteId: website.id,
  });
}

export async function disableWebsiteModule({
  database,
  moduleKey,
  request,
  websiteId,
}: {
  database: Database;
  moduleKey: ModuleKey;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "modules:manage",
    request,
    websiteId,
  });
  assertSharozConnectedWebsite(website);

  const enabledModules = await getEnabledModuleKeySet({
    database,
    organizationId: website.organizationId,
    websiteId: website.id,
  });
  const enabledDependents = getDependentModuleKeys(moduleKey).filter((dependent) =>
    enabledModules.has(dependent),
  );

  if (enabledDependents.includes("orders")) {
    throw new ModuleEnablementError("Orders requires Catalog and Customers.");
  }

  const now = new Date();
  const existing = await database.query.websiteModules.findFirst({
    where: and(
      eq(websiteModules.organizationId, website.organizationId),
      eq(websiteModules.websiteId, website.id),
      eq(websiteModules.moduleKey, moduleKey),
    ),
  });

  if (existing) {
    await database
      .update(websiteModules)
      .set({ enabled: false, updatedAt: now })
      .where(eq(websiteModules.id, existing.id));
  } else {
    await database.insert(websiteModules).values({
      enabled: false,
      moduleKey,
      organizationId: website.organizationId,
      websiteId: website.id,
    });
  }

  await writeModuleAudit({
    action: "website_module.disabled",
    database,
    moduleKey,
    organizationId: website.organizationId,
    request,
    websiteId: website.id,
  });
}
