import { NextResponse, type NextRequest } from "next/server";

const stagingAccessCookieName = "sharoz_staging_access";

function shouldBypass(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/preview") ||
    pathname.startsWith("/staging-access") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  );
}

async function sha256(value: string) {
  const input = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", input);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function configuredStagingHash() {
  const hash = process.env.SHAROZ_STAGING_ACCESS_SECRET_HASH?.trim();
  if (hash) {
    return hash;
  }

  const secret = process.env.SHAROZ_STAGING_ACCESS_SECRET?.trim();
  return secret ? `sha256:${await sha256(secret)}` : null;
}

export async function middleware(request: NextRequest) {
  if (process.env.SHAROZ_STAGING_ACCESS_ENABLED !== "true") {
    return NextResponse.next();
  }

  if (shouldBypass(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const hash = await configuredStagingHash();
  if (!hash) {
    return NextResponse.json({ error: "Staging access is not configured." }, { status: 503 });
  }

  const expected = await sha256(`staging:${hash}`);
  const provided = request.cookies.get(stagingAccessCookieName)?.value;

  if (provided === expected) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/staging-access";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!api).*)"],
};
