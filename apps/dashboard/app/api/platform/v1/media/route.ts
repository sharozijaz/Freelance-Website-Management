import type { createDatabaseClient } from "@agency/database";
import { database } from "@/lib/database";
import { createRequestId } from "@/lib/observability/request";
import { authenticatePlatformRequest } from "@/lib/platform-api/auth";
import { toPlatformErrorResponse } from "@/lib/platform-api/errors";
import { listPlatformMediaAssets } from "@/lib/platform-api/media";
import { platformDataResponse } from "@/lib/platform-api/responses";

type Database = ReturnType<typeof createDatabaseClient>;

function positiveIntegerParam(searchParams: URLSearchParams, name: string) {
  const value = searchParams.get(name);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

async function getPlatformMediaResponse({
  database: databaseClient,
  request,
}: {
  database: Database;
  request: Request;
}) {
  const requestId = createRequestId(request.headers.get("x-request-id"));

  try {
    const context = await authenticatePlatformRequest({ database: databaseClient, request });
    const url = new URL(request.url);
    const data = await listPlatformMediaAssets({
      context,
      database: databaseClient,
      options: {
        limit: positiveIntegerParam(url.searchParams, "limit"),
        page: positiveIntegerParam(url.searchParams, "page"),
      },
    });

    return platformDataResponse(data, undefined, requestId);
  } catch (error) {
    return toPlatformErrorResponse(error, requestId);
  }
}

export async function GET(request: Request) {
  return getPlatformMediaResponse({ database, request });
}
