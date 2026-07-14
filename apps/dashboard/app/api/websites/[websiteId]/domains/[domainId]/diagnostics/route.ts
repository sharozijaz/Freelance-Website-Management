import { NextResponse } from "next/server";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { inspectDomainDiagnostics } from "@/lib/deployment/services";
import { createRequestId } from "@/lib/observability/request";
import { operationalHeaders } from "@/lib/observability/responses";
import { getDashboardSessionContext } from "@/lib/session";

function errorResponse(error: unknown, requestId: string) {
  const message =
    error instanceof Error && error.message ? error.message : "Domain diagnostics failed.";
  return NextResponse.json(
    { error: message },
    { headers: operationalHeaders(requestId), status: 400 },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ domainId: string; websiteId: string }> },
) {
  const requestId = createRequestId(request.headers.get("x-request-id"));

  try {
    const context = await getDashboardSessionContext();
    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { headers: operationalHeaders(requestId), status: 401 },
      );
    }
    const { domainId, websiteId } = await params;
    const diagnostics = await inspectDomainDiagnostics({
      database,
      domainId,
      request: createDashboardRequest(context),
      websiteId,
    });
    return NextResponse.json({ diagnostics }, { headers: operationalHeaders(requestId) });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
