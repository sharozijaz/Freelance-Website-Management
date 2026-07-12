import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "./redirects";

export interface AuthMiddlewareOptions {
  signInPath?: string;
  publicRoutes?: string[];
  cookiePrefix?: string;
}

function isPublicRoute(pathname: string, publicRoutes: string[]): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function hasSessionCookie(request: NextRequest, cookiePrefix: string): boolean {
  return Boolean(
    request.cookies.get(`${cookiePrefix}.session_token`) ??
    request.cookies.get(`${cookiePrefix}-session_token`),
  );
}

export function createAuthMiddleware({
  cookiePrefix = "agency",
  publicRoutes = ["/", "/api/auth"],
  signInPath = "/sign-in",
}: AuthMiddlewareOptions = {}) {
  return function authMiddleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (isPublicRoute(pathname, publicRoutes)) {
      return NextResponse.next();
    }

    if (hasSessionCookie(request, cookiePrefix)) {
      return NextResponse.next();
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = signInPath;
    redirectUrl.search = "";
    redirectUrl.searchParams.set("callbackUrl", getSafeRedirectPath(`${pathname}${search}`));

    return NextResponse.redirect(redirectUrl);
  };
}
