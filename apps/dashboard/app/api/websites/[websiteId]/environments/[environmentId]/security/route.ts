import { NextResponse } from "next/server";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  rotatePreviewAccessToken,
  updateStagingAccessProtection,
  WebsiteEnvironmentError,
} from "@/lib/dashboard/environments";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof WebsiteEnvironmentError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ environmentId: string; websiteId: string }> },
) {
  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const { environmentId, websiteId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = stringValue(body.action);

    if (action === "rotate_preview") {
      const result = await rotatePreviewAccessToken({
        database,
        environmentId,
        request: dashboardRequest,
        websiteId,
      });

      return NextResponse.json(result);
    }

    if (action === "enable_staging_access") {
      const result = await updateStagingAccessProtection({
        database,
        enabled: true,
        environmentId,
        request: dashboardRequest,
        rotateSecret: true,
        websiteId,
      });

      return NextResponse.json(result);
    }

    if (action === "disable_staging_access") {
      const result = await updateStagingAccessProtection({
        database,
        enabled: false,
        environmentId,
        request: dashboardRequest,
        websiteId,
      });

      return NextResponse.json(result);
    }

    if (action === "rotate_staging_secret") {
      const result = await updateStagingAccessProtection({
        database,
        enabled: true,
        environmentId,
        request: dashboardRequest,
        rotateSecret: true,
        websiteId,
      });

      return NextResponse.json(result);
    }

    throw new WebsiteEnvironmentError("Environment security action is not supported.");
  } catch (error) {
    return errorResponse(error, "Environment security could not be updated.");
  }
}
