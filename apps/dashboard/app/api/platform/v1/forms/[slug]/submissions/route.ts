import type { createDatabaseClient } from "@agency/database";
import { database } from "@/lib/database";
import { createRequestId } from "@/lib/observability/request";
import { authenticatePlatformRequest } from "@/lib/platform-api/auth";
import { toPlatformErrorResponse } from "@/lib/platform-api/errors";
import { parseFormSubmissionBody, submitPlatformForm } from "@/lib/platform-api/forms";
import { platformDataResponse } from "@/lib/platform-api/responses";

type Database = ReturnType<typeof createDatabaseClient>;

async function submitPlatformFormResponse({
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
    const input = await parseFormSubmissionBody(request);
    const data = await submitPlatformForm({
      context,
      database: databaseClient,
      input,
      request,
      slug: decodeURIComponent(slug),
    });

    return platformDataResponse(data, { status: 201 }, requestId);
  } catch (error) {
    return toPlatformErrorResponse(error, requestId);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return submitPlatformFormResponse({
    database,
    request,
    slug: (await params).slug,
  });
}
