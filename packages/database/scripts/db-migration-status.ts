import { resolve } from "node:path";
import { projectSafeDatabaseTarget } from "../src/operations";
import {
  loadRootEnv,
  printTarget,
  repositoryRoot,
  requiredEnv,
  inspectMigrationStatus,
} from "./operations-runner";

loadRootEnv();

try {
  const databaseUrl = requiredEnv("DATABASE_URL");
  const target = projectSafeDatabaseTarget(databaseUrl);
  const status = await inspectMigrationStatus(
    databaseUrl,
    resolve(repositoryRoot, "packages/database/drizzle"),
  );

  printTarget("Migration status database", target);
  console.info(`- Drizzle migration table: ${status.trackingTableExists ? "present" : "missing"}`);
  console.info(`- Repository migrations: ${String(status.repositoryMigrationCount)}`);
  console.info(`- Recorded database migrations: ${String(status.databaseMigrationCount)}`);
  console.info(`- Latest recorded migration hash: ${status.latestRecordedMigration ?? "none"}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Migration status inspection failed.");
  process.exitCode = 1;
}
