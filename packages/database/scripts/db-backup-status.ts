import { inspectBackupStatus } from "../src/operations";
import { defaultBackupDir } from "./operations-runner";

const status = inspectBackupStatus(defaultBackupDir);

console.info("Local backup status:");
console.info(`- Backup directory exists: ${status.backupDirectoryExists ? "yes" : "no"}`);
console.info(`- Backup files: ${String(status.backupFileCount)}`);

if (status.latestBackup) {
  console.info(`- Latest backup timestamp: ${status.latestBackup.timestamp ?? "unknown"}`);
  console.info(`- Latest backup size: ${String(status.latestBackup.sizeBytes)} bytes`);
}
