import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { SafeDatabaseTarget } from "./database-url";
import { projectSafeDatabaseTarget, sameDatabaseTarget, toPgEnvironment } from "./database-url";

export type CommandRunner = (
  command: string,
  args: string[],
  options: CommandRunnerOptions,
) => CommandResult;

export interface CommandRunnerOptions {
  env: NodeJS.ProcessEnv;
}

export interface CommandResult {
  error?: { code?: string; message: string };
  signal?: NodeJS.Signals | null;
  status: number | null;
  stderr?: string;
}

export interface BackupCommandResult {
  filePath: string;
  target: SafeDatabaseTarget;
}

export interface BackupStatus {
  backupDirectoryExists: boolean;
  backupFileCount: number;
  latestBackup?: {
    sizeBytes: number;
    timestamp: string | null;
  };
}

const backupFilePattern = /^agency-platform-(\d{8}T\d{6}Z)\.dump$/;

function safeTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function createBackupFilename(date = new Date()) {
  return `agency-platform-${safeTimestamp(date)}.dump`;
}

function assertCommandSuccess(result: CommandResult, command: string) {
  if (result.error?.code === "ENOENT") {
    throw new Error(`${command} is not available. Install PostgreSQL client tools and retry.`);
  }

  if (result.error) {
    throw new Error(`${command} failed to start.`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${String(result.status ?? "unknown")}.`);
  }
}

function withPgEnvironment(databaseUrl: string, label: string, env: NodeJS.ProcessEnv) {
  return {
    ...env,
    ...toPgEnvironment(databaseUrl, label),
  };
}

export function createBackup({
  backupDir,
  databaseUrl,
  now = new Date(),
  run,
}: {
  backupDir: string;
  databaseUrl: string;
  now?: Date;
  run: CommandRunner;
}): BackupCommandResult {
  const target = projectSafeDatabaseTarget(databaseUrl);
  const outputDir = resolve(backupDir);
  mkdirSync(outputDir, { recursive: true });

  const filePath = join(outputDir, createBackupFilename(now));
  const result = run(
    "pg_dump",
    ["--format=custom", "--no-owner", "--no-privileges", "--file", filePath],
    { env: withPgEnvironment(databaseUrl, "DATABASE_URL", process.env) },
  );

  assertCommandSuccess(result, "pg_dump");

  if (!existsSync(filePath) || statSync(filePath).size <= 0) {
    throw new Error("pg_dump completed but did not produce a non-empty backup file.");
  }

  return { filePath, target };
}

export function inspectBackupStatus(backupDir: string): BackupStatus {
  const outputDir = resolve(backupDir);

  if (!existsSync(outputDir)) {
    return { backupDirectoryExists: false, backupFileCount: 0 };
  }

  const backups = readdirSync(outputDir)
    .filter((fileName) => backupFilePattern.test(fileName))
    .map((fileName) => {
      const stats = statSync(join(outputDir, fileName));
      const match = backupFilePattern.exec(fileName);

      return {
        fileName,
        sizeBytes: stats.size,
        timestamp: match?.[1] ?? null,
      };
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  const latestBackup = backups.at(-1);

  return {
    backupDirectoryExists: true,
    backupFileCount: backups.length,
    ...(latestBackup
      ? { latestBackup: { sizeBytes: latestBackup.sizeBytes, timestamp: latestBackup.timestamp } }
      : {}),
  };
}

export function restoreBackup({
  activeDatabaseUrl,
  allowRestore,
  backupFile,
  restoreDatabaseUrl,
  run,
}: {
  activeDatabaseUrl?: string;
  allowRestore: boolean;
  backupFile: string;
  restoreDatabaseUrl?: string;
  run: CommandRunner;
}): SafeDatabaseTarget {
  if (!restoreDatabaseUrl?.trim()) {
    throw new Error("RESTORE_DATABASE_URL is required for restore operations.");
  }

  if (!allowRestore) {
    throw new Error(
      "Restore refused. Set SHAROZ_ALLOW_DATABASE_RESTORE=true or pass --confirm-restore.",
    );
  }

  if (activeDatabaseUrl?.trim() && sameDatabaseTarget(activeDatabaseUrl, restoreDatabaseUrl)) {
    throw new Error("Restore refused because RESTORE_DATABASE_URL targets the active database.");
  }

  const resolvedBackup = resolve(backupFile);
  if (!existsSync(resolvedBackup)) {
    throw new Error(`Backup file was not found: ${basename(backupFile)}`);
  }

  const target = projectSafeDatabaseTarget(restoreDatabaseUrl, "RESTORE_DATABASE_URL");
  const result = run(
    "pg_restore",
    ["--no-owner", "--no-privileges", "--dbname", target.databaseName, resolvedBackup],
    { env: withPgEnvironment(restoreDatabaseUrl, "RESTORE_DATABASE_URL", process.env) },
  );

  assertCommandSuccess(result, "pg_restore");

  return target;
}
