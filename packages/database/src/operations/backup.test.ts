import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CommandRunner } from "./backup";
import { createBackup, createBackupFilename, inspectBackupStatus, restoreBackup } from "./backup";
import { sameDatabaseTarget, projectSafeDatabaseTarget } from "./database-url";
import { projectMigrationStatus, projectRestoreVerification } from "./migration-status";
import { assertDemoSeedAllowed } from "./seed-safety";

const activeUrl = "postgres://user:password@localhost:5432/agency_platform?sslmode=disable";
const restoreUrl =
  "postgres://user:password@localhost:5432/agency_platform_restore?sslmode=disable";

function tempDir(name: string) {
  return join(tmpdir(), `sharoz-${name}-${randomUUID()}`);
}

describe("database URL safety", () => {
  it("projects safe metadata without credentials", () => {
    const target = projectSafeDatabaseTarget(activeUrl);
    const serialized = JSON.stringify(target);

    expect(target).toEqual({
      databaseName: "agency_platform",
      host: "localhost",
      isLocal: true,
      ssl: "not_expected",
    });
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("user");
  });

  it("normalizes equivalent active and restore targets", () => {
    expect(
      sameDatabaseTarget(
        "postgres://user:password@localhost/agency_platform",
        "postgresql://other:secret@localhost:5432/agency_platform",
      ),
    ).toBe(true);
  });
});

describe("backup orchestration", () => {
  it("generates timestamped custom-format backup names", () => {
    expect(createBackupFilename(new Date("2026-07-14T12:00:00.000Z"))).toBe(
      "agency-platform-20260714T120000Z.dump",
    );
  });

  it("creates the backup directory and rejects empty backups", () => {
    const backupDir = tempDir("backup-empty");
    const run: CommandRunner = () => ({ status: 0 });

    expect(() => createBackup({ backupDir, databaseUrl: activeUrl, run })).toThrow(
      "non-empty backup file",
    );
  });

  it("passes database credentials through process env, not command args", () => {
    const backupDir = tempDir("backup-success");
    let commandArgs: string[] = [];
    let commandPassword: string | undefined;
    const run: CommandRunner = (_command, args, options) => {
      commandArgs = args;
      commandPassword = options.env.PGPASSWORD;
      const filePath = args[args.indexOf("--file") + 1];
      writeFileSync(filePath ?? "", "backup");
      return { status: 0 };
    };

    createBackup({ backupDir, databaseUrl: activeUrl, run });

    expect(commandArgs.join(" ")).not.toContain("password");
    expect(commandArgs.join(" ")).not.toContain(activeUrl);
    expect(commandPassword).toBe("password");
  });

  it("fails loudly when pg_dump is unavailable", () => {
    const backupDir = tempDir("backup-missing-tool");
    const run: CommandRunner = () => ({
      error: { code: "ENOENT", message: "not found" },
      status: null,
    });

    expect(() => createBackup({ backupDir, databaseUrl: activeUrl, run })).toThrow(
      "pg_dump is not available",
    );
  });

  it("reports backup status without exposing paths or filenames", () => {
    const backupDir = tempDir("backup-status");
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(join(backupDir, "agency-platform-20260714T120000Z.dump"), "backup");

    expect(inspectBackupStatus(backupDir)).toEqual({
      backupDirectoryExists: true,
      backupFileCount: 1,
      latestBackup: {
        sizeBytes: 6,
        timestamp: "20260714T120000Z",
      },
    });

    rmSync(backupDir, { recursive: true, force: true });
  });
});

describe("restore guardrails", () => {
  it("rejects missing restore target", () => {
    expect(() =>
      restoreBackup({
        activeDatabaseUrl: activeUrl,
        allowRestore: true,
        backupFile: "backup.dump",
        run: () => ({ status: 0 }),
      }),
    ).toThrow("RESTORE_DATABASE_URL is required");
  });

  it("rejects restore without explicit opt-in", () => {
    expect(() =>
      restoreBackup({
        activeDatabaseUrl: activeUrl,
        allowRestore: false,
        backupFile: "backup.dump",
        restoreDatabaseUrl: restoreUrl,
        run: () => ({ status: 0 }),
      }),
    ).toThrow("Restore refused");
  });

  it("rejects restore into the active database", () => {
    expect(() =>
      restoreBackup({
        activeDatabaseUrl: activeUrl,
        allowRestore: true,
        backupFile: "backup.dump",
        restoreDatabaseUrl: "postgres://other:secret@localhost:5432/agency_platform",
        run: () => ({ status: 0 }),
      }),
    ).toThrow("active database");
  });

  it("requires the backup file to exist before pg_restore runs", () => {
    expect(() =>
      restoreBackup({
        activeDatabaseUrl: activeUrl,
        allowRestore: true,
        backupFile: "missing.dump",
        restoreDatabaseUrl: restoreUrl,
        run: () => ({ status: 0 }),
      }),
    ).toThrow("Backup file was not found");
  });
});

describe("migration and restore status projection", () => {
  it("projects migration status without mutating state", () => {
    expect(
      projectMigrationStatus({
        databaseMigrations: ["hash-a", "hash-b"],
        repositoryMigrationCount: 10,
        trackingTableExists: true,
      }),
    ).toEqual({
      databaseMigrationCount: 2,
      latestRecordedMigration: "hash-b",
      repositoryMigrationCount: 10,
      trackingTableExists: true,
    });
  });

  it("projects restore table verification without row contents", () => {
    const result = projectRestoreVerification(["organizations", "websites"]);

    expect(result.ok).toBe(false);
    expect(result.missingTables).toContain("website_environments");
  });
});

describe("seed safety", () => {
  it("guards demo seeds behind explicit opt-in", () => {
    expect(() => {
      assertDemoSeedAllowed({});
    }).toThrow("SHAROZ_SEED_CONNECTED_DEMO=true");
    expect(() => {
      assertDemoSeedAllowed({ SHAROZ_SEED_CONNECTED_DEMO: "true" });
    }).not.toThrow();
  });
});
