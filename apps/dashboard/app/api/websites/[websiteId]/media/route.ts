import { NextResponse } from "next/server";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  listWebsiteMediaAssets,
  MediaDomainError,
  registerWebsiteMediaAsset,
} from "@/lib/dashboard/media";
import { requireDashboardSessionContext } from "@/lib/session";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof MediaDomainError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  try {
    const context = await requireDashboardSessionContext();
    const request = createDashboardRequest(context);
    const { websiteId } = await params;
    const assets = await listWebsiteMediaAssets({
      database,
      includeArchived: true,
      request,
      websiteId,
    });

    return NextResponse.json({ assets });
  } catch (error) {
    return errorResponse(error, "Media assets could not be loaded.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const { websiteId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const asset = await registerWebsiteMediaAsset({
      database,
      input: body,
      request: dashboardRequest,
      websiteId,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Media asset could not be registered.");
  }
}
