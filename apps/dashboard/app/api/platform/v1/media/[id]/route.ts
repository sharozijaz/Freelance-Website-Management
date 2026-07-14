import type { createDatabaseClient } from "@agency/database";
import { database } from "@/lib/database";
import { createRequestId } from "@/lib/observability/request";
import { authenticatePlatformRequest } from "@/lib/platform-api/auth";
import { toPlatformErrorResponse } from "@/lib/platform-api/errors";
import { getPlatformMediaAssetById } from "@/lib/platform-api/media";
import { platformDataResponse } from "@/lib/platform-api/responses";

type Database = ReturnType<typeof createDatabaseClient>;

async function getPlatformMediaAssetResponse({
  database: databaseClient,
  id,
  request,
}: {
  database: Database;
  id: string;
  request: Request;
}) {
  const requestId = createRequestId(request.headers.get("x-request-id"));

  try {
    const context = await authenticatePlatformRequest({ database: databaseClient, request });
    const data = await getPlatformMediaAssetById({
      context,
      database: databaseClient,
      id: decodeURIComponent(id),
    });

    return platformDataResponse(data, undefined, requestId);
  } catch (error) {
    return toPlatformErrorResponse(error, requestId);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return getPlatformMediaAssetResponse({
    database,
    id: (await params).id,
    request,
  });
}
