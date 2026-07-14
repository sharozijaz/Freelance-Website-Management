import { NextResponse } from "next/server";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  createWebsiteCredential,
  listWebsiteCredentials,
  WebsiteCredentialError,
} from "@/lib/dashboard/website-credentials";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateValue(value: unknown): Date | null {
  const raw = stringValue(value);
  return raw ? new Date(raw) : null;
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof WebsiteCredentialError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const { websiteId } = await params;
    const result = await listWebsiteCredentials({ database, request: dashboardRequest, websiteId });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Website credentials could not be loaded.");
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
    const environmentId = stringValue(body.environmentId);
    const label = stringValue(body.label);

    if (!label) {
      throw new WebsiteCredentialError("Credential label is required.");
    }

    if (!environmentId) {
      throw new WebsiteCredentialError("Credential environment is required.");
    }

    const result = await createWebsiteCredential({
      database,
      input: {
        environmentId,
        expiresAt: dateValue(body.expiresAt),
        label,
      },
      request: dashboardRequest,
      websiteId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Website credential could not be created.");
  }
}
