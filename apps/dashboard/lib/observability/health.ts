export type HealthCheckStatus = "error" | "ok";

export interface HealthStatus {
  checks: {
    application: HealthCheckStatus;
    database: HealthCheckStatus;
  };
  status: HealthCheckStatus;
  timestamp: string;
}

export async function getHealthStatus({
  checkDatabase,
}: {
  checkDatabase: () => Promise<void>;
}): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = {
    application: "ok",
    database: "ok",
  };

  try {
    await checkDatabase();
  } catch {
    checks.database = "error";
  }

  return {
    checks,
    status: checks.database === "ok" ? "ok" : "error",
    timestamp: new Date().toISOString(),
  };
}
