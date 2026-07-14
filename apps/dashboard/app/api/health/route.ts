import { sql } from "drizzle-orm";
import { database } from "@/lib/database";
import { getHealthStatus } from "@/lib/observability/health";
import { logger } from "@/lib/observability/logger";
import { createRequestId } from "@/lib/observability/request";
import { operationalHeaders } from "@/lib/observability/responses";

const databaseTimeoutMs = 2000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise.finally(() => {
      if (timeout) clearTimeout(timeout);
    }),
    new Promise<T>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error("Health check timed out."));
      }, timeoutMs);
    }),
  ]);
}

async function checkDatabase() {
  await withTimeout(database.execute(sql`select 1`), databaseTimeoutMs);
}

export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const health = await getHealthStatus({ checkDatabase });

  if (health.status === "error") {
    logger.warn("health.check_failed", { checks: health.checks }, requestId);
  }

  return Response.json(health, {
    headers: operationalHeaders(requestId),
    status: health.status === "ok" ? 200 : 503,
  });
}
