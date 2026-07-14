# V1 Release Readiness

This document records the final V1 hardening pass for the Agency Website Platform. It describes the current implementation, what was verified, and what remains limited for the first real freelance client website test.

## Platform Purpose

The platform gives a web design agency one operating system for client websites: client/workspace management, project tracking, reusable website rendering, Payload CMS content management, SEO operations, forms/submissions, manual and provider-based hosting records, deployments, and domain operations.

V1 is designed for a real agency-owned test website. It is not a white-label SaaS, billing system, visual page builder, AI generator, hosting reseller, FTP/SSH deployment client, or domain registrar.

## Runtime Architecture

- `apps/dashboard` is the authenticated agency operations dashboard on port `3000`.
- `apps/cms` is the Payload CMS application on port `3001`.
- `apps/web` is the reusable public client website renderer on port `3003`.
- `apps/website` is the original starter website shell and is not the active V1 renderer.
- `packages/auth` owns Better Auth integration, session helpers, organization-aware RBAC, route guards, and permission utilities.
- `packages/database` owns the Drizzle schema and PostgreSQL connection layer.
- `packages/ui` owns the shared design system and reusable UI components.
- `packages/lib` owns shared utilities such as SEO, preview helpers, and environment validation.

## Environment Configuration

Required production variables are validated server-side by `requireProductionEnv`.

Required for dashboard production:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

Required for CMS production:

- `DATABASE_URL`
- `PAYLOAD_SECRET`

Required for public website production:

- `DATABASE_URL`
- `PAYLOAD_API_URL`
- `WEB_ORGANIZATION_ID`
- `WEBSITE_PREVIEW_SECRET`
- `WEBSITE_REVALIDATION_SECRET`

Optional or deployment-provider variables remain provider-specific. Server secrets must not use `NEXT_PUBLIC_` prefixes. `.env` and local owner password files remain ignored by Git.

## Local Development

Install dependencies:

```bash
pnpm install
```

Apply database migrations:

```bash
pnpm --filter @agency/database db:migrate
```

Create the first agency owner after setting local owner variables:

```bash
pnpm bootstrap:owner
```

Start V1 apps:

```bash
pnpm --filter @agency/dashboard dev
pnpm --filter @agency/cms dev
pnpm --filter @agency/web dev
```

Local URLs:

- Dashboard: `http://localhost:3000`
- Payload CMS: `http://localhost:3001/admin`
- Public website renderer: `http://localhost:3003`

## Hosted PostgreSQL / Neon

V1 uses PostgreSQL through Drizzle and Payload's Postgres adapter. Neon is supported through `DATABASE_URL`; Docker is not required.

Operational requirements:

- Run Drizzle migrations before starting the dashboard.
- Let Payload manage its own tables in the `payload_cms` schema.
- Keep `public` app tables and Payload CMS tables separate.
- Back up the database before production migrations.
- Verify connection pooling limits for the selected Neon plan.

## Authentication Behavior

Dashboard authentication uses Better Auth. Sessions are secure, organization-aware, and protected by server-side route checks. Callback URLs are sanitized through the shared auth redirect utilities. Protected dashboard routes redirect unauthenticated users to `/sign-in`.

Payload CMS currently uses a separate `cms-users` Payload auth collection. This separation is intentional for V1 and avoids merging Payload admin authentication with the dashboard Better Auth session model before the permissions bridge is fully productized.

## Date And Serialization Strategy

Dashboard pages normalize date-like values before rendering. Shared helpers in `apps/dashboard/lib/dashboard/dates.ts` convert `Date`, serialized date strings, and nullish values consistently before UI formatting. Server/service boundaries should pass JSON-safe DTOs to client components and avoid calling `toLocaleDateString`, `toLocaleString`, `toISOString`, or `getTime` on unnormalized values.

## Tenant Isolation

Every core resource is organization-scoped. Dashboard service functions use session-derived membership scope instead of trusting UI visibility. Agency owner access can operate across organizations; non-agency users are scoped to active memberships.

Verified representative query behavior:

- Agency owner can list clients, projects, websites, SEO summaries, team data, content operations, media, forms, submissions, activity, and attention items.
- Client workspace overview loads for a scoped organization.
- Project detail and website detail load for authorized scope.
- Cross-tenant website detail access fails closed for a viewer scoped to another organization.

## RBAC

Server authorization remains authoritative. UI affordances are secondary. Existing role support covers agency owner, agency admin, client admin, editor, writer, and viewer through shared permission helpers in `packages/auth`.

V1 smoke verification covered representative read paths and cross-tenant denial. Full browser-based mutation testing should be repeated for each production release using the release checklist.

## Error Handling

Dashboard mutation endpoints now use a safe error-message convention. Known user-action errors can be returned to the UI, while unexpected exceptions are logged server-side and replaced with generic user-safe messages. Public users should not see raw SQL, file paths, stack traces, provider tokens, database URLs, or authentication internals.

## Security Headers

All Next.js apps now set:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

The dashboard also sets:

- `X-Frame-Options: DENY`

Content Security Policy is intentionally deferred for V1 because Payload Admin and Next.js development/runtime scripts need a tested CSP rollout. CSP should be added after collecting required directives in a staging environment.

## Rate Limiting And Abuse Boundaries

Application-level in-memory rate limits protect exposed V1 public website endpoints:

- Preview endpoint
- Revalidation endpoint
- Form submission endpoint

Authentication, provider webhooks, and edge abuse controls should also be protected at the deployment platform level for production.

## Input Validation

Dashboard and website modules use schema validation and server-side permission checks for implemented workflows. Domain, URL, SEO, project, website, form, and deployment provider data should continue to be validated at service boundaries. Rich content rendering is constrained by Payload-managed data and React rendering, but custom HTML blocks remain a future-risk area and should stay disabled or admin-only unless sanitized.

## Website Rendering Security

The public renderer resolves tenant content from configured website and organization environment variables. Public content reads are scoped to tenant data. Published page/post access is separated so pages can respect workflow status while posts rely on Payload draft status. Preview and revalidation endpoints validate shared secrets and are rate limited.

Build-time CMS outages no longer fail the production website build. Static params, sitemap, and robots generation fail soft with conservative output while runtime routes remain dynamic-capable.

## SEO Verification

Verified V1 SEO behavior includes:

- Metadata generation from CMS content and site settings.
- Canonical URL utilities shared in one SEO layer.
- Robots route responding successfully.
- Sitemap route responding successfully.
- Sitemap generation scoped to published content queries.

Production SEO origin should be verified after assigning the real primary domain.

## Deployment And Domain Hardening

Deployment provider code keeps credentials server-side. Manual hosting is represented as manual operations and does not pretend to trigger provider APIs. Provider capabilities are modeled explicitly so unsupported actions can fail safely. Domain and deployment operations should be smoke-tested with the target provider before a client launch.

## Performance Findings

Dashboard list views use pagination and bounded limits. Website static generation is bounded and now resilient to unavailable CMS. Payload cold-start/schema introspection in development can be slow; this was observed during HTTP smoke checks and should not be confused with a production 500.

## UI Completion And Accessibility

Core dashboard route builds are present for clients, projects, websites, content, media, forms, submissions, SEO, deployments, domains, and settings. Shared UI components provide semantic controls, labels, focus styles, empty states, and status indicators. V1 visual QA should still be repeated in a browser for the actual client data set and long real-world names/domains.

## Verification Results

Quality gates run:

- `pnpm format:check` passed.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed with 66 tests.
- `pnpm build` passed for all workspace apps/packages with required production env values passed through Turborepo.

Database smoke:

- Representative dashboard queries executed against PostgreSQL.
- Client, project, website, SEO, team, activity, and attention reads completed.
- Project detail and website detail completed.
- Cross-tenant website detail access failed closed.

HTTP smoke:

- Dashboard sign-in page returned `200`.
- Unauthenticated `/clients` redirected to `/sign-in?callbackUrl=%2Fclients`.
- Authenticated sign-in through Better Auth returned `200`.
- Authenticated `/clients` returned `200`.
- CMS admin returned `200` after dev warm-up.
- Public website home returned `200` after dev warm-up.
- `robots.txt` returned `200`.
- `sitemap.xml` returned `200`.

Logout note:

- Raw HTTP logout calls were blocked by Better Auth CSRF protection. Browser/client logout should be verified manually through the dashboard sign-out button during the final release smoke. This is documented as a required checklist item.

## Known V1 Limitations

- Payload CMS admin authentication is separate from Better Auth dashboard authentication.
- CSP is deferred pending staged testing.
- Application-level rate limiting is in-memory and should be complemented with platform-level limits in production.
- Visual page builder and drag-and-drop editing are not part of V1.
- `apps/web` is the active V1 website renderer; `apps/website` is a legacy/starter shell.
- External provider deployment flows require real provider credentials and staging verification.
- Browser-based logout and full mutation workflow should be manually verified before the first client launch.
- Custom HTML blocks should remain restricted because sanitization policy is not finalized.

## Deferred V2 Features

- Visual page builder
- AI writing and SEO assistants
- Figma importer
- Billing and invoices
- Domain purchasing
- FTP, SSH, cPanel deployment
- Advanced analytics
- CRM and email marketing
- White-label SaaS features
- Plugin marketplace

## Final Readiness Status

V1 is ready for a controlled real-client test after completing the checklist in `docs/V1_RELEASE_CHECKLIST.md`, including browser logout verification and production provider/domain smoke checks. It should not yet be marketed as a fully self-serve production SaaS.
