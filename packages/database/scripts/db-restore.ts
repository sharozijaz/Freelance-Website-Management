import { restoreBackup } from "../src/operations";
import { loadRootEnv, printTarget, requiredEnv, runCommand } from "./operations-runner";

loadRootEnv();

const backupFile = process.argv[2];

try {
  if (!backupFile) {
    throw new Error("Backup file path is required. Usage: pnpm db:restore -- <backup-file>");
  }

  const target = restoreBackup({
    allowRestore:
      process.env.SHAROZ_ALLOW_DATABASE_RESTORE === "true" ||
      process.argv.includes("--confirm-restore"),
    backupFile,
    restoreDatabaseUrl: requiredEnv("RESTORE_DATABASE_URL"),
    run: runCommand,
    ...(process.env.DATABASE_URL?.trim()
      ? { activeDatabaseUrl: process.env.DATABASE_URL.trim() }
      : {}),
  });

  printTarget("Restore target database", target);
  console.info("Restore completed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database restore failed.");
  process.exitCode = 1;
}
