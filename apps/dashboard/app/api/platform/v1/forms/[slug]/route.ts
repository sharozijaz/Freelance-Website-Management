import type { createDatabaseClient } from "@agency/database";
import { database } from "@/lib/database";
import { createRequestId } from "@/lib/observability/request";
import { authenticatePlatformRequest } from "@/lib/platform-api/auth";
import { toPlatformErrorResponse } from "@/lib/platform-api/errors";
import { getPlatformFormBySlug } from "@/lib/platform-api/forms";
import { platformDataResponse } from "@/lib/platform-api/responses";

type Database = ReturnType<typeof createDatabaseClient>;

async function getPlatformFormResponse({
  database: databaseClient,
  request,
  slug,
}: {
  database: Database;
  request: Request;
  slug: string;
}) {
  const requestId = createRequestId(request.headers.get("x-request-id"));

  try {
    const context = await authenticatePlatformRequest({ database: databaseClient, request });
    const data = await getPlatformFormBySlug({
      context,
      database: databaseClient,
      slug: decodeURIComponent(slug),
    });

    return platformDataResponse(data, undefined, requestId);
  } catch (error) {
    return toPlatformErrorResponse(error, requestId);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return getPlatformFormResponse({
    database,
    request,
    slug: (await params).slug,
  });
}
