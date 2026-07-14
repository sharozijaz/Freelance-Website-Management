import type { createDatabaseClient } from "@agency/database";
import { database } from "@/lib/database";
import { createRequestId } from "@/lib/observability/request";
import { authenticatePlatformRequest } from "@/lib/platform-api/auth";
import { getPlatformBlogPostBySlug } from "@/lib/platform-api/blog";
import { toPlatformErrorResponse } from "@/lib/platform-api/errors";
import { platformDataResponse } from "@/lib/platform-api/responses";

type Database = ReturnType<typeof createDatabaseClient>;

function previewParam(request: Request) {
  return request.headers.get("x-sharoz-preview") === "true";
}

async function getPlatformBlogPostBySlugResponse({
  database: databaseClient,
  params,
  request,
}: {
  database: Database;
  params: { slug: string };
  request: Request;
}) {
  const requestId = createRequestId(request.headers.get("x-request-id"));

  try {
    const context = await authenticatePlatformRequest({ database: databaseClient, request });
    const data = await getPlatformBlogPostBySlug({
      context,
      database: databaseClient,
      options: { preview: previewParam(request) },
      slug: decodeURIComponent(params.slug),
    });

    return platformDataResponse(data, undefined, requestId);
  } catch (error) {
    return toPlatformErrorResponse(error, requestId);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return getPlatformBlogPostBySlugResponse({
    database,
    params: await params,
    request,
  });
}
