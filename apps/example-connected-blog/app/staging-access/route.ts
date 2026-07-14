import { NextResponse, type NextRequest } from "next/server";
import {
  accessCookieName,
  isStagingAccessProtectionEnabled,
  sessionCookieValue,
} from "@/lib/access";
import { hashAccessSecret, safeRedirectPath, verifyAccessSecret } from "@/lib/access-core";

function configuredStagingHash() {
  const hash = process.env.SHAROZ_STAGING_ACCESS_SECRET_HASH?.trim();
  if (hash) {
    return hash;
  }

  const localSecret = process.env.SHAROZ_STAGING_ACCESS_SECRET?.trim();
  return localSecret ? hashAccessSecret(localSecret) : null;
}

export function GET(request: NextRequest) {
  const redirectTo = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));

  if (!isStagingAccessProtectionEnabled()) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  const token = request.nextUrl.searchParams.get("token");

  if (!verifyAccessSecret({ expectedHash: configuredStagingHash(), providedSecret: token })) {
    return new NextResponse(
      "<!doctype html><title>Staging access</title><h1>Staging access required</h1><p>Use a valid staging access link to continue.</p>",
      {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 401,
      },
    );
  }

  const value = sessionCookieValue("staging");
  if (!value) {
    return NextResponse.json({ error: "Staging access is not configured." }, { status: 503 });
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(accessCookieName("staging"), value, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
