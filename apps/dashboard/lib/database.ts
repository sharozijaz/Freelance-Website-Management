import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabaseClient } from "@agency/database";
import { config as loadEnv } from "dotenv";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(currentDir, "../../..", ".env");

loadEnv({ path: rootEnvPath, quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(`DATABASE_URL is required for Dashboard database. Expected it in ${rootEnvPath}.`);
}

export const database = createDatabaseClient({
  connectionString: databaseUrl,
});
