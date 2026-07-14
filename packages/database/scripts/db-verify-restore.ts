import { projectSafeDatabaseTarget } from "../src/operations";
import { loadRootEnv, printTarget, requiredEnv, verifyRestoreDatabase } from "./operations-runner";

loadRootEnv();

try {
  const restoreDatabaseUrl = requiredEnv("RESTORE_DATABASE_URL");
  const target = projectSafeDatabaseTarget(restoreDatabaseUrl, "RESTORE_DATABASE_URL");
  const result = await verifyRestoreDatabase(restoreDatabaseUrl);

  printTarget("Restore verification database", target);
  console.info(`- Connectivity: ok`);
  console.info(`- Drizzle migration table: ${result.migrationTableExists ? "present" : "missing"}`);
  console.info(`- Required tables checked: ${String(result.requiredTableCount)}`);
  console.info(
    `- Missing required tables: ${result.missingTables.length ? result.missingTables.join(", ") : "none"}`,
  );
  console.info(`- Verification: ${result.ok ? "passed" : "failed"}`);

  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Restore verification failed.");
  process.exitCode = 1;
}
