import type { createDatabaseClient } from "@agency/database";
import { database } from "@/lib/database";
import { createRequestId } from "@/lib/observability/request";
import { authenticatePlatformRequest } from "@/lib/platform-api/auth";
import { listPlatformBlogTags } from "@/lib/platform-api/blog";
import { toPlatformErrorResponse } from "@/lib/platform-api/errors";
import { platformDataResponse } from "@/lib/platform-api/responses";

type Database = ReturnType<typeof createDatabaseClient>;

async function getPlatformBlogTagsResponse({
  database: databaseClient,
  request,
}: {
  database: Database;
  request: Request;
}) {
  const requestId = createRequestId(request.headers.get("x-request-id"));

  try {
    const context = await authenticatePlatformRequest({ database: databaseClient, request });
    const data = await listPlatformBlogTags({ context, database: databaseClient });

    return platformDataResponse(data, undefined, requestId);
  } catch (error) {
    return toPlatformErrorResponse(error, requestId);
  }
}

export async function GET(request: Request) {
  return getPlatformBlogTagsResponse({ database, request });
}
