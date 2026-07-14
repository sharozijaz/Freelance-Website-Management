import { NextResponse } from "next/server";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  archiveWebsiteMediaAsset,
  MediaDomainError,
  restoreWebsiteMediaAsset,
  updateWebsiteMediaAsset,
} from "@/lib/dashboard/media";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof MediaDomainError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mediaAssetId: string; websiteId: string }> },
) {
  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const { mediaAssetId, websiteId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = stringValue(body.action);

    if (action === "update") {
      const asset = await updateWebsiteMediaAsset({
        database,
        input: body,
        mediaAssetId,
        request: dashboardRequest,
        websiteId,
      });

      return NextResponse.json({ asset });
    }

    if (action === "archive") {
      const asset = await archiveWebsiteMediaAsset({
        database,
        mediaAssetId,
        request: dashboardRequest,
        websiteId,
      });

      return NextResponse.json({ asset });
    }

    if (action === "restore") {
      const asset = await restoreWebsiteMediaAsset({
        database,
        mediaAssetId,
        request: dashboardRequest,
        websiteId,
      });

      return NextResponse.json({ asset });
    }

    throw new MediaDomainError("Media action is not supported.");
  } catch (error) {
    return errorResponse(error, "Media asset could not be updated.");
  }
}
