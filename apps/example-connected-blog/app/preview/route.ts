import { NextResponse, type NextRequest } from "next/server";
import { accessCookieName, sessionCookieValue } from "@/lib/access";
import { hashAccessSecret, safeRedirectPath, verifyAccessSecret } from "@/lib/access-core";

function configuredPreviewHash() {
  const hash = process.env.SHAROZ_PREVIEW_ACCESS_TOKEN_HASH?.trim();
  if (hash) {
    return hash;
  }

  const localSecret = process.env.SHAROZ_PREVIEW_ACCESS_TOKEN?.trim();
  return localSecret ? hashAccessSecret(localSecret) : null;
}

export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirectTo = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));

  if (!verifyAccessSecret({ expectedHash: configuredPreviewHash(), providedSecret: token })) {
    return NextResponse.json({ error: "Invalid preview token." }, { status: 401 });
  }

  const value = sessionCookieValue("preview");
  if (!value) {
    return NextResponse.json({ error: "Preview is not configured." }, { status: 503 });
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(accessCookieName("preview"), value, {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
