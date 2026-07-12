import { createAuthMiddleware } from "@agency/auth/middleware";

export const middleware = createAuthMiddleware({
  publicRoutes: ["/", "/api/auth", "/invite", "/sign-in"],
  signInPath: "/sign-in",
});

export const config = {
  matcher: [
    "/clients/:path*",
    "/projects/:path*",
    "/websites/:path*",
    "/deployments/:path*",
    "/domains/:path*",
    "/content/:path*",
    "/media/:path*",
    "/forms/:path*",
    "/submissions/:path*",
    "/team/:path*",
    "/cms/:path*",
    "/media/:path*",
    "/seo/:path*",
    "/forms/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
