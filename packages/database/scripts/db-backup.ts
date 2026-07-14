import { createBackup } from "../src/operations";
import {
  defaultBackupDir,
  loadRootEnv,
  printTarget,
  requiredEnv,
  runCommand,
} from "./operations-runner";

loadRootEnv();

try {
  const result = createBackup({
    backupDir: defaultBackupDir,
    databaseUrl: requiredEnv("DATABASE_URL"),
    run: runCommand,
  });

  printTarget("Backup source database", result.target);
  console.info(`Backup created: ${result.filePath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database backup failed.");
  process.exitCode = 1;
}
