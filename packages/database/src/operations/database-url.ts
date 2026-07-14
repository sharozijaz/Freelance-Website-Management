export interface SafeDatabaseTarget {
  databaseName: string;
  host: string;
  isLocal: boolean;
  ssl: "expected" | "not_expected" | "unknown";
}

export interface PgEnvironment {
  PGDATABASE: string;
  PGHOST: string;
  PGPORT?: string;
  PGPASSWORD?: string;
  PGSSLMODE?: string;
  PGUSER?: string;
}

function parseDatabaseUrl(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL.`);
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${label} must use postgres:// or postgresql://.`);
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!url.hostname || !databaseName) {
    throw new Error(`${label} must include a host and database name.`);
  }

  return { databaseName, url };
}

function sslExpectation(url: URL): SafeDatabaseTarget["ssl"] {
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

  if (sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full") {
    return "expected";
  }

  if (sslMode === "disable") {
    return "not_expected";
  }

  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
    return "not_expected";
  }

  return "unknown";
}

export function projectSafeDatabaseTarget(
  value: string,
  label = "DATABASE_URL",
): SafeDatabaseTarget {
  const { databaseName, url } = parseDatabaseUrl(value, label);

  return {
    databaseName,
    host: url.hostname,
    isLocal: url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1",
    ssl: sslExpectation(url),
  };
}

export function toPgEnvironment(value: string, label = "DATABASE_URL"): PgEnvironment {
  const { databaseName, url } = parseDatabaseUrl(value, label);
  const sslMode = url.searchParams.get("sslmode") ?? undefined;

  return {
    PGDATABASE: databaseName,
    PGHOST: url.hostname,
    ...(url.port ? { PGPORT: url.port } : {}),
    ...(url.username ? { PGUSER: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { PGPASSWORD: decodeURIComponent(url.password) } : {}),
    ...(sslMode ? { PGSSLMODE: sslMode } : {}),
  };
}

export function normalizeDatabaseIdentity(value: string, label = "DATABASE_URL") {
  const { databaseName, url } = parseDatabaseUrl(value, label);

  return {
    databaseName,
    host: url.hostname.toLowerCase(),
    port: url.port || "5432",
  };
}

export function sameDatabaseTarget(activeUrl: string, restoreUrl: string) {
  const active = normalizeDatabaseIdentity(activeUrl, "DATABASE_URL");
  const restore = normalizeDatabaseIdentity(restoreUrl, "RESTORE_DATABASE_URL");

  return (
    active.databaseName === restore.databaseName &&
    active.host === restore.host &&
    active.port === restore.port
  );
}
