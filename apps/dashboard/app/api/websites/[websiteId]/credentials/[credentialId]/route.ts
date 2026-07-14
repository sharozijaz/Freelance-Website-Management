import { NextResponse } from "next/server";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  revokeWebsiteCredential,
  rotateWebsiteCredential,
  WebsiteCredentialError,
} from "@/lib/dashboard/website-credentials";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof WebsiteCredentialError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ credentialId: string; websiteId: string }> },
) {
  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const { credentialId, websiteId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = stringValue(body.action);

    if (action === "revoke") {
      const credential = await revokeWebsiteCredential({
        credentialId,
        database,
        request: dashboardRequest,
        websiteId,
      });

      return NextResponse.json({ credential });
    }

    if (action === "rotate") {
      const result = await rotateWebsiteCredential({
        credentialId,
        database,
        request: dashboardRequest,
        websiteId,
      });

      return NextResponse.json(result);
    }

    throw new WebsiteCredentialError("Credential action is not supported.");
  } catch (error) {
    return errorResponse(error, "Website credential could not be updated.");
  }
}
