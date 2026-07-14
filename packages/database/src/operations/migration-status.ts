export interface MigrationStatusProjection {
  databaseMigrationCount: number;
  latestRecordedMigration: string | null;
  repositoryMigrationCount: number;
  trackingTableExists: boolean;
}

export function projectMigrationStatus({
  databaseMigrations,
  repositoryMigrationCount,
  trackingTableExists,
}: {
  databaseMigrations: string[];
  repositoryMigrationCount: number;
  trackingTableExists: boolean;
}): MigrationStatusProjection {
  return {
    databaseMigrationCount: databaseMigrations.length,
    latestRecordedMigration: databaseMigrations.at(-1) ?? null,
    repositoryMigrationCount,
    trackingTableExists,
  };
}

export const coreRestoreTables = [
  "organizations",
  "users",
  "websites",
  "website_environments",
  "blog_posts",
  "blog_categories",
  "forms",
  "form_submissions",
  "media_assets",
  "deployments",
  "domains",
] as const;

export function projectRestoreVerification(existingTables: string[]) {
  const existing = new Set(existingTables);
  const missingTables = coreRestoreTables.filter((table) => !existing.has(table));

  return {
    missingTables,
    ok: missingTables.length === 0,
    requiredTableCount: coreRestoreTables.length,
  };
}
