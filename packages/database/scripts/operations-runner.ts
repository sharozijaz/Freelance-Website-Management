import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import type { CommandRunner } from "../src/operations";
import {
  coreRestoreTables,
  projectMigrationStatus,
  projectRestoreVerification,
} from "../src/operations";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(scriptDir, "../../..");
export const defaultBackupDir = resolve(repositoryRoot, ".backups");

export function loadRootEnv() {
  loadEnv({ path: resolve(repositoryRoot, ".env"), quiet: true });
}

export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export const runCommand: CommandRunner = (command, args, options) => {
  const result = spawnSync(command, args, {
    env: options.env,
    stdio: ["ignore", "ignore", "pipe"],
  });
  const errorCode = result.error && "code" in result.error ? result.error.code : undefined;
  const stderr = (result as { stderr?: Buffer }).stderr;

  return {
    ...(result.error
      ? {
          error: {
            ...(typeof errorCode === "string" ? { code: errorCode } : {}),
            message: result.error.message,
          },
        }
      : {}),
    signal: result.signal,
    status: result.status,
    stderr: stderr?.toString("utf8") ?? "",
  };
};

export function printTarget(
  label: string,
  target: { databaseName: string; host: string; ssl: string },
) {
  console.info(`${label}:`);
  console.info(`- Host: ${target.host}`);
  console.info(`- Database: ${target.databaseName}`);
  console.info(`- SSL: ${target.ssl}`);
}

export async function verifyRestoreDatabase(restoreDatabaseUrl: string) {
  const sql = postgres(restoreDatabaseUrl, { max: 1, prepare: false });

  try {
    await sql`select 1`;

    const rows = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ${sql(coreRestoreTables)}
      order by table_name
    `;
    const migrationTableRows = await sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'drizzle'
          and table_name = '__drizzle_migrations'
      ) as exists
    `;

    return {
      migrationTableExists: Boolean(migrationTableRows[0]?.exists),
      ...projectRestoreVerification(rows.map((row) => row.table_name)),
    };
  } finally {
    await sql.end();
  }
}

export async function inspectMigrationStatus(databaseUrl: string, migrationDir: string) {
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    await sql`select 1`;

    const trackingRows = await sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'drizzle'
          and table_name = '__drizzle_migrations'
      ) as exists
    `;
    const trackingTableExists = Boolean(trackingRows[0]?.exists);
    const databaseMigrations = trackingTableExists
      ? await sql<{ hash: string; created_at: Date | null }[]>`
          select hash, created_at
          from drizzle.__drizzle_migrations
          order by created_at asc nulls first, id asc
        `
      : [];

    const { readdirSync } = await import("node:fs");
    const repositoryMigrationCount = readdirSync(migrationDir).filter((fileName) =>
      /^\d{4}_.+\.sql$/.test(fileName),
    ).length;

    return projectMigrationStatus({
      databaseMigrations: databaseMigrations.map((row) => row.hash),
      repositoryMigrationCount,
      trackingTableExists,
    });
  } finally {
    await sql.end();
  }
}
