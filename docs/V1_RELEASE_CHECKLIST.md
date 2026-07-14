# V1 Release Checklist

Use this checklist before every V1 production or client-test release.

## Database

- [ ] Hosted PostgreSQL or Neon database is created.
- [ ] `DATABASE_URL` is configured only as a server secret.
- [ ] Drizzle migrations are applied.
- [ ] Payload CMS schema is initialized in the `payload_cms` schema.
- [ ] Database backup/export strategy is acknowledged.
- [ ] Migration rollback plan is acknowledged.

## Environment

- [ ] Dashboard production env vars are configured: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- [ ] CMS production env vars are configured: `DATABASE_URL`, `PAYLOAD_SECRET`.
- [ ] Website production env vars are configured: `DATABASE_URL`, `PAYLOAD_API_URL`, `WEB_ORGANIZATION_ID`, `WEBSITE_PREVIEW_SECRET`, `WEBSITE_REVALIDATION_SECRET`.
- [ ] Optional provider secrets are configured only for enabled providers.
- [ ] No real secrets are committed to Git.
- [ ] `.env.example` contains safe placeholders only.

## Authentication

- [ ] Agency owner exists.
- [ ] Agency owner can sign in.
- [ ] Dashboard session persists across refresh.
- [ ] Dashboard sign-out button invalidates the session in a browser.
- [ ] Protected dashboard routes redirect unauthenticated users to sign-in.
- [ ] Payload CMS admin user exists separately from dashboard Better Auth users.
- [ ] Payload CMS admin can sign in.

## Tenant Isolation And RBAC

- [ ] Agency owner can access agency-level operations.
- [ ] Client admin can access only assigned client organization data.
- [ ] Editor/writer/viewer permissions match server authorization.
- [ ] Cross-tenant client detail access fails closed.
- [ ] Cross-tenant project detail access fails closed.
- [ ] Cross-tenant website detail access fails closed.
- [ ] Cross-tenant content/media/form/submission access fails closed.
- [ ] Mutations cannot change organization IDs to bypass tenant scope.

## Client Workflow

- [ ] Create or open client.
- [ ] Create or open project.
- [ ] Create or open website.
- [ ] Open website detail.
- [ ] Configure website metadata and status.
- [ ] Confirm dashboard routes refresh without serialization errors.

## Content And CMS

- [ ] Open Payload CMS admin.
- [ ] Upload media.
- [ ] Create or edit page.
- [ ] Add supported Starter Website Kit sections.
- [ ] Save draft.
- [ ] Publish page.
- [ ] Public website renders the published page.
- [ ] Draft/unpublished content is not public without preview.

## SEO

- [ ] Configure title and meta description.
- [ ] Verify canonical URL.
- [ ] Verify Open Graph metadata.
- [ ] Verify robots behavior.
- [ ] Verify XML sitemap.
- [ ] Verify primary domain origin after domain setup.

## Forms And Submissions

- [ ] Form renders on public website where configured.
- [ ] Invalid submission is rejected.
- [ ] Valid submission is stored.
- [ ] Dashboard submissions page loads.
- [ ] Submission status changes persist.

## Hosting And Deployments

- [ ] Manual hosting is clearly labeled when selected.
- [ ] External provider credentials are server-only when configured.
- [ ] Unsupported provider actions fail safely.
- [ ] Manual deployment can be recorded.
- [ ] Deployment detail page loads.
- [ ] Provider/domain tokens are not logged.

## Domains

- [ ] Add domain.
- [ ] Duplicate domain is rejected.
- [ ] Cross-tenant domain assignment fails.
- [ ] DNS state is visible.
- [ ] SSL state is visible.
- [ ] One primary domain is enforced.
- [ ] Public SEO origin uses the primary domain.

## Quality Gates

- [ ] `pnpm format:check` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes with production-required env vars.

## Runtime Smoke

- [ ] Dashboard `/sign-in` returns `200`.
- [ ] Dashboard protected routes fail closed when signed out.
- [ ] Authenticated dashboard `/clients` returns `200`.
- [ ] CMS `/admin` returns `200`.
- [ ] Website home returns `200`.
- [ ] Website `robots.txt` returns `200`.
- [ ] Website `sitemap.xml` returns `200`.
- [ ] Browser logout redirects to sign-in and prevents protected access.

## Release Decision

- [ ] Known V1 limitations are reviewed.
- [ ] External dependencies are verified or explicitly deferred.
- [ ] Backup plan is acknowledged.
- [ ] First client-test scope is approved.
- [ ] Release owner signs off.
