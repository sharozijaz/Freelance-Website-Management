import { NextResponse, type NextRequest } from "next/server";
import { accessCookieName } from "@/lib/access";
import { safeRedirectPath } from "@/lib/access-core";

export function GET(request: NextRequest) {
  const redirectTo = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  response.cookies.delete(accessCookieName("preview"));

  return response;
}
