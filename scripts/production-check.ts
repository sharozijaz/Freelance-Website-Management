import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { validateProductionEnvironment } from "../apps/dashboard/lib/production/config";

loadEnv({ path: ".env", quiet: true });

const result = validateProductionEnvironment(process.env);
const repositoryErrors: string[] = [];

for (const filePath of [
  "packages/database/scripts/db-backup.ts",
  "packages/database/scripts/db-restore.ts",
  "packages/database/scripts/db-verify-restore.ts",
  "docs/V2_BACKUP_RECOVERY.md",
]) {
  if (!existsSync(filePath)) {
    repositoryErrors.push(`${filePath} is required.`);
  }
}

if (!existsSync(".gitignore") || !readFileSync(".gitignore", "utf8").includes(".backups/")) {
  repositoryErrors.push(".backups/ must be listed in .gitignore.");
}

if (!result.ok || repositoryErrors.length > 0) {
  console.error("Production configuration check failed:");
  for (const error of [...result.errors, ...repositoryErrors]) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.info("Production configuration check passed.");
