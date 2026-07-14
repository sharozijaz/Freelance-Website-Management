import type { createDatabaseClient } from "@agency/database";
import { createRequestId } from "@/lib/observability/request";
import { authenticatePlatformRequest } from "./auth";
import { getPlatformContext } from "./context";
import { toPlatformErrorResponse } from "./errors";
import { platformDataResponse } from "./responses";

type Database = ReturnType<typeof createDatabaseClient>;

export async function getPlatformContextResponse({
  database,
  request,
}: {
  database: Database;
  request: Request;
}) {
  const requestId = createRequestId(request.headers.get("x-request-id"));

  try {
    const context = await authenticatePlatformRequest({ database, request });
    const data = await getPlatformContext({ context, database });

    return platformDataResponse(data, undefined, requestId);
  } catch (error) {
    return toPlatformErrorResponse(error, requestId);
  }
}
