# V2 Repository Audit

This audit reviews the current Sharoz Platform repository against the V2 product definition:

> A centralized agency website control plane with modular business backends for custom Next.js websites.

The review is based on actual repository files under `apps`, `packages`, `docs`, `scripts`, Drizzle schemas, migrations, auth/RBAC code, Payload configuration, dashboard services, website renderer code, deployment/domain code, and tests. No V2 implementation work was performed.

## 1. Executive Assessment

The current repository is a mixed architecture:

- A reusable agency control-plane foundation exists and should be preserved.
- A generic CMS/page-builder architecture exists and conflicts with the V2 direction.
- A partial website management platform exists for clients, projects, websites, domains, hosting, deployments, forms, media, SEO, and audit activity.
- A public website renderer exists, but it is a V1 CMS-controlled renderer, not a V2 custom website starter or SDK consumer.

The strongest V2-aligned parts are:

- `packages/database` core tables for organizations, users, memberships, projects, websites, domains, hosting connections, deployments, invitations, and audit logs.
- `packages/auth` Better Auth integration and capability-based RBAC foundation.
- `apps/dashboard/lib/dashboard` service/query layer.
- `apps/dashboard/lib/deployment` provider abstraction.
- `packages/lib/src/seo.ts` SEO normalization and rule utilities.
- Existing tenant-scoped forms and submissions.

The weakest V2-aligned parts are:

- `apps/cms` Payload page/blocks model.
- `apps/web` public renderer and block engine.
- `apps/web/features/blocks` and Starter Website Kit sections.
- Payload-owned `Pages.layout`, navigation, site settings, and theme/block settings.

The repository should be evolved into V2, not replaced, but only with a deliberate pivot that preserves the control plane while deprecating CMS-driven public website rendering.

## 2. Current Repository Map

### `apps/dashboard`

Current responsibility:

- Authenticated agency dashboard.
- Clients/workspaces, projects, websites, content operations, media, forms, submissions, SEO, deployments, domains, settings, team.
- App Router pages and route handlers.
- Service/query logic in `apps/dashboard/lib/dashboard`.
- Deployment/domain logic in `apps/dashboard/lib/deployment`.

Dependencies:

- `@agency/auth`
- `@agency/database`
- `@agency/lib`
- `@agency/types`
- `@agency/ui`
- Better Auth, Drizzle, Next.js, React, Zod.

Architectural role:

- Closest existing match to V2 Agency Control Plane.
- Should remain the main dashboard shell and be reorganized around V2 modules.

### `apps/cms`

Current responsibility:

- Payload CMS application.
- Payload admin at `/admin`.
- Payload collections: `cms-users`, `pages`, `posts`, `categories`, `tags`, `authors`, `media`, `navigation`, `redirects`, `site-settings`.
- Payload block definitions for page layout composition.
- Payload tables stored under Postgres schema `payload_cms`.

Dependencies:

- Payload, Payload Postgres adapter, Lexical editor, Sharp.
- `@agency/auth`, `@agency/database`, `@agency/lib`.

Architectural role:

- V1 CMS and page composition system.
- Not aligned with V2 as the source of public website presentation.
- Can be retained temporarily for content editing or migration, but should not be the long-term module backend boundary.

### `apps/web`

Current responsibility:

- Reusable public client website renderer.
- Fetches Payload documents from `PAYLOAD_API_URL`.
- Renders Payload pages/posts, layouts, blocks, starter sections, forms, metadata, robots, sitemap.
- Exposes preview, revalidation, and public form submission routes.

Dependencies:

- `@agency/database`
- `@agency/lib`
- `@agency/types`
- `@agency/ui`
- Next.js, React, Drizzle.

Architectural role:

- V1 rendering engine.
- Conflicts with V2 because it controls layouts, sections, and public presentation.
- Useful as reference for SDK data fetching, forms, SEO, and preview patterns, but should not become the V2 website starter as-is.

### `apps/website`

Current responsibility:

- Minimal starter shell from early foundation work.

Architectural role:

- Not the active V1 renderer.
- Can be removed later or replaced by a V2 `website-starter`, but not during this audit.

### `packages/database`

Current responsibility:

- Drizzle schema and migrations.
- PostgreSQL client factory.

Architectural role:

- Strong V2 foundation.
- Needs additive evolution for website types, care plans, maintenance, module enablement, website credentials, API keys, and domain-specific modules.

### `packages/auth`

Current responsibility:

- Better Auth setup.
- Session context.
- Active organization handling.
- Capability permissions and role mappings.
- Organization/member/invitation helpers.
- Route middleware and guards.

Architectural role:

- Strong V2 foundation.
- Permission vocabulary needs V2 module names, but the pattern is correct.

### `packages/ui`

Current responsibility:

- Shared dashboard/UI component library, design tokens, foundations.

Architectural role:

- Keep for dashboard/admin UI.
- Do not impose it on custom public websites.

### `packages/lib`

Current responsibility:

- SEO utilities.
- Preview token helpers.
- Environment helpers.
- Class name utility.

Architectural role:

- Keep and split by boundary later: platform/server utilities versus SDK-safe utilities.

### `packages/config`, `packages/types`, `packages/eslint-config`, `packages/typescript-config`

Current responsibility:

- Shared configuration and placeholder shared types.

Architectural role:

- Keep.
- Rename from `agency` namespace to `sharoz` when the V2 package identity is finalized.

## 3. Current Data Model Assessment

### Reusable Core Tables

From `packages/database/src/schema/core.ts` and migrations:

- `organizations`
- `users`
- `auth_sessions`
- `auth_accounts`
- `auth_verifications`
- `memberships`
- `websites`
- `domains`
- `hosting_provider_connections`
- `deployments`
- `projects`
- `project_assignments`
- `invitations`
- `audit_logs`

These are reusable for V2.

### CMS / Content Tables

From `packages/database/src/schema/placeholders.ts`:

- `pages`
- `posts`
- `media_assets`
- `forms`
- `form_fields`
- `form_submissions`
- `seo_metadata`
- `analytics_events`

Assessment:

- `posts` are too minimal for a real Blog module: no excerpt, rich content, featured image, categories, tags, SEO relation, publish workflow detail, or author relation beyond `author_user_id`.
- `pages` should not be a V2 platform-owned page composition model for custom websites.
- `forms`, `form_fields`, and `form_submissions` are closer to V2 module models and should be preserved/extended.
- `media_assets` is useful but needs storage provider and website-scoped module semantics clarified.
- `seo_metadata` is generic but acceptable as a cross-resource metadata table if resource ownership is well-defined.
- `analytics_events` is a placeholder, not an operational analytics module.

### Website Operational Tables

Strong V2 alignment:

- `websites`
- `domains`
- `hosting_provider_connections`
- `deployments`
- `projects`
- `audit_logs`

Missing for V2:

- website type: WordPress, Sharoz Connected, External / Legacy
- care plan relationship
- maintenance records
- health checks
- backups
- uptime checks
- module enablement
- website API credentials
- webhook subscriptions
- SDK/client access records

### Tenant Boundaries

Strong boundaries:

- Most operational tables include `organization_id`.
- Most website data includes `website_id`.
- Dashboard service functions usually call `assertDashboardPermission` or `requireWebsiteAccess`.

Weak boundaries:

- `media_assets.website_id` is nullable. That is useful for shared assets but risky for V2 website data if APIs do not distinguish organization-level media from website-owned media.
- `seo_metadata.resource_type` and `resource_id` are generic. This is flexible but has no FK to the target resource.
- Payload tables live in `payload_cms` and are not governed by the Drizzle schema. Their tenant boundaries are enforced by Payload access functions rather than database FKs.
- `domains` has a global unique `domain` index, which is operationally reasonable, but domain transfer workflows will need explicit ownership rules.

### Generic Abstractions

Generic CMS abstractions present:

- Payload `pages.layout` blocks.
- `apps/web/features/blocks`.
- `packages/database` `pages` table.
- `seo_metadata.resource_type/resource_id`.
- Content operation screens that treat page and post as generic content.

Domain-specific models present:

- `forms`, `form_fields`, `form_submissions`
- `deployments`, `domains`, `hosting_provider_connections`
- `projects`, `project_assignments`

V2 should continue the domain-specific direction.

## 4. Authentication And Authorization Audit

### Current Session Architecture

`packages/auth/src/server.ts` creates Better Auth with:

- Drizzle adapter.
- `users`, `auth_sessions`, `auth_accounts`, `auth_verifications` models.
- email/password enabled.
- email verification and password reset hooks.
- secure cookies in production.
- `agency` cookie prefix.

Dashboard wires this through `apps/dashboard/app/api/auth/[...all]/route.ts` and `apps/dashboard/lib/auth.ts`.

### Organization Membership Architecture

`memberships` links `users` to `organizations` with:

- role
- status
- explicit permission overrides
- invited/accepted/disabled timestamps

Users can belong to multiple organizations.

### Active Organization Logic

`packages/auth/src/session.ts` resolves active organization from:

- `agency_active_organization_id` cookie
- session active organization
- first active membership fallback

This is V2-compatible, but the dashboard should avoid assuming that active organization is always the target website's organization.

### Permission Model

Current permissions include:

- `organization:*`
- `users:*`
- `projects:*`
- `websites:*`
- `deployments:*`
- `hosting:*`
- `domains:*`
- `cms:*`
- `media:manage`
- `forms:*`
- `seo:manage`
- `analytics:read`
- `settings:manage`
- `audit:read`
- `billing:manage`

This is capability-based, which V2 should keep. Required modifications:

- Replace CMS-centered permissions with module permissions:
  - `blog:read`
  - `blog:create`
  - `blog:update`
  - `blog:publish`
  - `catalog:read`
  - `catalog:update`
  - `orders:read`
  - `orders:update`
  - `customers:read`
  - `booking:manage`
  - `maintenance:create`
  - `developer:credentials`
- Keep infrastructure permissions:
  - `clients:read`
  - `websites:read`
  - `domains:manage`
  - `deployments:read`
  - `hosting:manage`

### Route Protection

`apps/dashboard/middleware.ts` protects dashboard routes and leaves sign-in, invite, and auth public. API route handlers also call service functions with server-side permission checks. This is V2-compatible.

### Tenant Isolation

`apps/dashboard/lib/dashboard/access.ts` centralizes:

- `getScopedOrganizationIds`
- `assertDashboardPermission`
- `assertAgencyOperationsAccess`

This should be preserved. V2 module services should use these helpers or a generalized `requirePermission` facade rather than comparing role names.

### What V2 Can Keep

- Better Auth database integration.
- Shared `SessionContext`.
- Membership model.
- Active organization cookie pattern.
- Capability-based permission helpers.
- Dashboard middleware.
- Invitation/member workflows.

### What Requires Modification

- Permission vocabulary.
- Module-specific permission checks.
- Website API credential authentication for public custom websites.
- Platform API auth separate from browser dashboard auth.
- Payload auth bridge or Payload deprecation.

## 5. Payload CMS Audit

### What Payload Owns Today

Payload owns:

- Admin interface for content.
- `cms-users` authentication.
- `pages`
- `posts`
- `categories`
- `tags`
- `authors`
- `media`
- `navigation`
- `redirects`
- `site-settings`
- Page versions, drafts, scheduled publishing.
- Rich text fields.
- Media uploads and image sizes.
- Page block layout composition.

### Existing Collections

Actual collection registry in `apps/cms/src/collections/index.ts`:

- `CmsUsers`
- `Pages`
- `Posts`
- `Categories`
- `Tags`
- `Authors`
- `Media`
- `Navigation`
- `Redirects`
- `SiteSettings`

### Content Scoping

Payload uses an `organizationId` text field and sometimes `websiteId` text field. This is not the same level of referential integrity as Drizzle FKs. Access controls attempt to scope reads/writes through `apps/cms/src/access/index.ts`.

### Auth Relationship To Dashboard Auth

Payload uses separate `cms-users`. It does not reuse Better Auth sessions. Some Payload access helpers expect a user shape with `activeOrganizationId`, `memberships`, and `role`, but the actual Payload auth collection is separate. This is an integration mismatch.

### Coupling To CMS Model

Payload is tightly coupled to V1 CMS behavior:

- `Pages.layout` stores block-driven presentation.
- Blocks include Hero, Features, Services, Pricing, FAQ, CTA, Footer, Contact, and future presentation settings.
- Page content drives `apps/web` rendering.
- SEO rules inspect block content for H1-like patterns.

### Recommendation: LIMITED USE

Do not remove Payload immediately. Use limited, transitional Payload support for:

- Existing V1 content experiments.
- Potential editorial rich text editing during migration.
- Export/migration source for posts/media.

Do not use Payload as the V2 public website presentation engine. V2 modules should move to explicit Drizzle-owned domain models and platform APIs. Payload should not own frontend layout, section composition, theme, navigation presentation, or custom website rendering.

## 6. Feature Classification Matrix

| Feature          | Classification | Current implementation                                           | V2 relevance                            | Required action                                                                       |
| ---------------- | -------------- | ---------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| Clients          | MODIFY         | `organizations` plus `/clients` dashboard routes                 | Core agency control plane               | Rename/productize as client organizations; add client metadata/care plan relationship |
| Projects         | KEEP           | `projects`, `project_assignments`, project services              | Core agency workflow                    | Keep and add V2 project type/status refinements                                       |
| Websites         | MODIFY         | `websites` with name, slug, status, theme, URLs                  | Core fleet object                       | Add website type, stack, module enablement, health, credentials                       |
| Organizations    | KEEP           | `organizations`                                                  | Tenant root                             | Keep; distinguish agency org vs client org if needed                                  |
| Memberships      | KEEP           | `memberships` with roles/permissions/status                      | Tenant access                           | Keep; expand permissions                                                              |
| Authentication   | KEEP           | Better Auth in `packages/auth`                                   | Core                                    | Keep; add API credential auth                                                         |
| RBAC             | MODIFY         | capability-based but CMS-heavy permissions                       | Core                                    | Replace `cms:*` with module permissions                                               |
| Dashboard shell  | KEEP           | `apps/dashboard/components/dashboard-shell.tsx`                  | Core UI                                 | Keep; add module nav registry                                                         |
| Website overview | MODIFY         | website detail aggregates pages/posts/forms/media/hosting        | Core                                    | Shift from CMS content summary to website modules/health/care plan                    |
| CMS              | DEPRECATE      | Payload app and collections                                      | Transitional only                       | Keep temporarily; stop making it the platform center                                  |
| Collections      | DEPRECATE      | Payload pages/posts/categories/tags/navigation/settings          | Conflicts with V2 generic CMS avoidance | Migrate useful data into explicit modules                                             |
| Content entries  | REBUILD        | Drizzle `pages`, `posts` placeholders plus Payload docs          | Blog module needs explicit model        | Build Blog tables/API/SDK; do not keep generic page builder                           |
| Forms            | MODIFY         | Drizzle `forms`, `form_fields`, `form_submissions`; web renderer | V2 Forms module                         | Keep and make API/SDK-first                                                           |
| Media            | MODIFY         | Payload media plus Drizzle `media_assets`                        | V2 Media module                         | Consolidate ownership/storage model                                                   |
| SEO              | MODIFY         | generic SEO utilities and `seo_metadata`                         | V2 SEO module                           | Keep utilities; add module API contracts                                              |
| Domains          | KEEP           | `domains`, domain services                                       | Core agency control plane               | Keep; add health/renewal/registrar metadata later                                     |
| Hosting          | KEEP           | `hosting_provider_connections` and manual/Vercel adapters        | Core                                    | Keep; add WordPress/external hosting metadata                                         |
| Deployments      | KEEP           | `deployments`, provider registry                                 | Core                                    | Keep; process real webhooks later                                                     |
| API keys         | REBUILD        | Not implemented                                                  | Required developer platform             | Add website credentials and scoped tokens                                             |
| Webhooks         | MODIFY         | Vercel signature route only                                      | Required developer platform             | Add first-party webhook subscriptions/events                                          |
| Audit logs       | KEEP           | `audit_logs`                                                     | Core                                    | Keep; expand module event coverage                                                    |
| Client access    | MODIFY         | memberships/invitations                                          | Core                                    | Keep; add module-level client access policies                                         |

## 7. Code Reuse Map

### Preserve

- `packages/database/src/schema/core.ts`
- `packages/database/src/client.ts`
- `packages/database/drizzle/0000_silent_hellion.sql`
- `packages/database/drizzle/0001_futuristic_smiling_tiger.sql`
- `packages/database/drizzle/0002_project_lifecycle.sql`
- `packages/database/drizzle/0003_forms_submissions.sql`
- `packages/database/drizzle/0004_deployment_hosting.sql`
- `packages/auth/src/server.ts`
- `packages/auth/src/session.ts`
- `packages/auth/src/permissions.ts`
- `packages/auth/src/guards.ts`
- `packages/auth/src/middleware.ts`
- `packages/auth/src/organizations.ts`
- `apps/dashboard/lib/dashboard/access.ts`
- `apps/dashboard/lib/dashboard/projects.ts`
- `apps/dashboard/lib/dashboard/content-ops.ts` for Forms module extraction
- `apps/dashboard/lib/dashboard/queries.ts` for client/website/dashboard overview patterns
- `apps/dashboard/lib/deployment/*`
- `apps/dashboard/app/api/webhooks/vercel/route.ts` as webhook verification reference
- `packages/lib/src/seo.ts`
- `packages/lib/src/preview.ts`
- `packages/lib/src/env.ts`
- `packages/ui/src/*` for dashboard UI
- Tests for auth, dashboard access, forms, deployment services, SEO, preview tokens, tenant resolution

### Do Not Copy Into V2 Module Architecture

- `apps/web/features/blocks/*`
- `apps/web/features/layouts/*`
- `apps/web/features/renderer/*`
- `apps/web/features/blocks/sections/*`
- `apps/cms/src/blocks/*`
- Payload `Pages.layout`
- Payload `Navigation` and `SiteSettings` as public frontend composition source
- `apps/web/lib/payload/*` as a platform API pattern
- generic page-builder assumptions in `packages/lib/src/seo.ts` such as H1 detection from blocks, unless isolated as V1-only

### Reuse With Modification

- `apps/web/features/forms/*` -> extract contract and submission flow into SDK/API examples.
- `apps/web/app/api/forms/submit/route.ts` -> replace with platform public submission endpoint.
- `apps/web/lib/tenant.ts` -> adapt to API credential/domain resolution.
- `apps/dashboard/lib/dashboard/seo.ts` -> split into SEO module service.
- `apps/dashboard/lib/dashboard/content-ops.ts` -> split Forms, Media, and legacy Content.

## 8. V2 Gap Analysis

### Agency Control Plane Gaps

Missing or partial:

- website type support: WordPress, Sharoz Connected, External / Legacy
- care plans
- maintenance history
- included service allowances
- time tracking
- content update usage
- review dates
- website health checks
- uptime monitoring
- backup tracking
- WordPress registry metadata
- WordPress connector/plugin integration records
- fleet-level website health dashboard

### Modular Website Services Gaps

Missing:

- module registry
- enabled website modules table
- module navigation registry
- module event contracts
- Blog domain tables with categories/tags/content/SEO/media relationships
- Catalog domain tables
- Orders domain tables
- Customers domain tables
- Booking domain tables
- module-scoped permissions
- module API namespaces
- module SDK namespaces

Partial:

- Forms module
- Media module
- SEO module

### Developer Platform Gaps

Missing:

- Platform API app or route namespace designed for websites
- `@sharoz/sdk`
- Next.js Website Starter for custom Figma-built sites
- website API credentials
- token rotation
- scoped API permissions
- webhook subscriptions
- revalidation event model
- Codex Build Guide for module consumption
- SDK tests and API contract tests

## 9. Generic CMS Decoupling Plan

### Current Dependencies On Generic Collections

- `apps/cms/src/collections/pages.ts`
- `apps/cms/src/collections/posts.ts`
- `apps/cms/src/collections/categories.ts`
- `apps/cms/src/collections/tags.ts`
- `apps/cms/src/collections/navigation.ts`
- `apps/cms/src/collections/site-settings.ts`
- `apps/web/lib/payload/queries.ts`
- `apps/web/app/[[...slug]]/page.tsx`
- `apps/web/app/blog/[slug]/page.tsx`
- `apps/web/app/sitemap.ts`
- `apps/web/app/robots.ts`
- `apps/web/features/renderer/*`
- `apps/web/features/blocks/*`
- dashboard content operations linking to Payload admin

### Routes Coupled To Collections

- Payload admin collection routes.
- Public `apps/web` dynamic page route.
- Public blog route.
- Dashboard `/content`.
- Dashboard content-related website summary.
- CMS preview/revalidation hooks.

### APIs Coupled To Content Entries

- Payload REST API fetches in `apps/web/lib/payload/client.ts`.
- Preview/revalidation utilities.
- SEO sitemap generation from Payload pages/posts.

### Staged Deprecation Strategy

1. Freeze CMS page-builder expansion.
2. Mark `apps/web` renderer as V1 legacy renderer.
3. Add V2 website type fields to `websites`.
4. Add `website_modules` table and module registry.
5. Build Blog module with explicit tables beside existing `posts`.
6. Build platform API read endpoints for Blog.
7. Build `@sharoz/sdk` against the platform API.
8. Build a custom Next.js Blog Website vertical slice.
9. Migrate or duplicate existing post content into Blog module tables.
10. Hide CMS layout/page-builder routes from V2 website workflows.
11. Keep Payload read-only or admin-only until V1 content no longer matters.
12. Remove Payload only after data export, module parity, and route replacement are complete.

## 10. Proposed V2 Target Architecture

Proposed monorepo structure, evolved from existing code:

```text
apps/
  dashboard/
  api/
  cms-legacy/
  website-starter/
  examples/
    custom-blog-website/
    restaurant-ordering-website/

packages/
  auth/
  database/
  ui/
  lib/
  sdk/
  platform-api/
  modules/
    core/
    blog/
    forms/
    media/
    seo/
    catalog/
    orders/
    customers/
    booking/
    care-plans/
    maintenance/
    website-health/
    wordpress/
  config/
  types/
  eslint-config/
  typescript-config/
```

Mapping:

- Agency Control Plane: `apps/dashboard`, `packages/modules/core`, `packages/modules/care-plans`, `packages/modules/maintenance`, `packages/modules/website-health`, `packages/modules/wordpress`.
- Blog Module: `packages/modules/blog`.
- Forms Module: evolve from `apps/dashboard/lib/dashboard/content-ops.ts` and `apps/web/features/forms`.
- Media Module: consolidate Payload media and Drizzle `media_assets`.
- SEO Module: evolve from `packages/lib/src/seo.ts` and `apps/dashboard/lib/dashboard/seo.ts`.
- Catalog, Orders, Customers, Booking: new explicit modules.
- Platform API: `apps/api` or dashboard route namespace if deployment simplicity is preferred; cleanly separated from dashboard UI.
- `@sharoz/sdk`: `packages/sdk`.
- Website Starter: `apps/website-starter`, not the current `apps/web` renderer.
- WordPress Integration: `packages/modules/wordpress`, future connector plugin outside or adjacent to this repo.

## 11. Database Evolution Plan

Additive-first. Do not drop current V1 tables in early V2.

### Preserve

- `organizations`
- `users`
- `auth_sessions`
- `auth_accounts`
- `auth_verifications`
- `memberships`
- `projects`
- `project_assignments`
- `websites`
- `domains`
- `hosting_provider_connections`
- `deployments`
- `invitations`
- `audit_logs`
- `forms`
- `form_fields`
- `form_submissions`
- `media_assets`
- `seo_metadata`

### Extend

- `websites`: add `website_type`, `stack`, `repository_url`, `environment`, `health_status`, `care_plan_id`, `external_admin_url`.
- `organizations`: add client/agency classification only if a single table cannot express it through metadata safely.
- `media_assets`: add storage provider, bucket/key fields, visibility, source module.
- `seo_metadata`: add stronger resource constraints through module-defined resource references or resource registry.
- `deployments`: add provider event synchronization status.
- `domains`: add registrar, expiry, auto-renew, DNS provider if needed.

### Deprecate Later

- `pages` as public website page model.
- V1 `posts` placeholder after Blog module tables exist.
- Payload `payload_cms.pages` and block layout usage.
- Payload navigation/site settings as presentation source.

### Proposed New Tables

Core/developer platform:

- `website_modules`
- `website_api_credentials`
- `website_api_credential_events`
- `webhook_subscriptions`
- `webhook_deliveries`
- `module_events`

Care/maintenance:

- `care_plans`
- `website_care_plans`
- `maintenance_tasks`
- `maintenance_entries`
- `maintenance_time_entries`
- `website_health_checks`
- `website_backups`

Blog:

- `blog_posts`
- `blog_categories`
- `blog_post_categories`
- `blog_tags`
- `blog_post_tags`
- `blog_authors`

Catalog/orders/customers:

- `products`
- `product_categories`
- `product_images`
- `customers`
- `orders`
- `order_items`
- `order_events`

Booking:

- `services`
- `availability_rules`
- `bookings`
- `booking_events`

All business data tables must include `organization_id` and `website_id` unless they are explicitly organization-level configuration.

## 12. API And SDK Boundary

### Recommended Communication Model

Custom Next.js websites should not query the dashboard database or Payload directly. They should call a Platform API through `@sharoz/sdk`.

Boundary:

- Dashboard application: human management UI.
- Platform API: stable server API for websites and integrations.
- SDK: typed wrapper around Platform API.
- Public website: custom Next.js app that renders its own design.
- Public submission endpoints: platform-owned endpoints for forms/orders/bookings, protected by website credentials, rate limits, validation, and abuse checks.

### Website API Credentials

Credential model:

- Each Sharoz Connected website receives one or more server-side credentials.
- Credentials are scoped by website and module.
- Credentials are stored hashed.
- Credentials can be rotated and revoked.
- SDK server functions use credentials only on the server.
- Browser JavaScript never receives website API secrets.

Example access:

- `sdk.blog.listPosts()`
- `sdk.blog.getPostBySlug(slug)`
- `sdk.forms.submit(formId, data)` through safe public endpoint or server action
- `sdk.seo.getMetadata(resource)`

## 13. Module System Design

Do not build a plugin marketplace. Build first-party modules with consistent registration.

Each module should define:

- id
- display name
- database tables
- permissions
- API namespace
- SDK namespace
- dashboard navigation entries
- dashboard routes/components
- validation schemas
- event names
- webhook payload contracts

Suggested module registry shape conceptually:

- `blog`
- `forms`
- `media`
- `seo`
- `catalog`
- `orders`
- `customers`
- `booking`
- `care-plans`
- `maintenance`
- `website-health`
- `wordpress`

Enabled modules:

- Store per website in `website_modules`.
- Dashboard navigation reads enabled modules.
- Platform API rejects access to disabled modules.
- SDK exposes methods, but API authorization remains authoritative.

Events:

- `blog.post.published`
- `forms.submission.created`
- `orders.order.created`
- `orders.order.updated`
- `catalog.product.updated`
- `maintenance.task.completed`
- `website.health.failed`

## 14. Migration Risk Register

| Risk                                             | Rating   | Reason                                                                   | Mitigation                                                                     |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Payload deprecation                              | HIGH     | Payload owns current page/post/media/admin workflows                     | Freeze expansion, migrate data module by module                                |
| Tenant isolation regression                      | CRITICAL | V2 adds website API credentials and public endpoints                     | Enforce `organization_id` and `website_id` on every module table and API query |
| Auth split between dashboard and API credentials | HIGH     | Browser auth and website server credentials have different threat models | Separate session auth from website credential auth                             |
| Generic CMS dependency leakage                   | HIGH     | `apps/web` and SEO rules depend on block/page assumptions                | Mark V1 renderer legacy and build SDK vertical slice                           |
| Existing migrations                              | MEDIUM   | Current migrations contain placeholder tables                            | Use additive migrations; do not rewrite history for existing environments      |
| API compatibility                                | MEDIUM   | No current platform API contract exists                                  | Version API from first V2 endpoint                                             |
| Module navigation                                | MEDIUM   | Dashboard routes are currently static                                    | Add module registry and enabled module checks                                  |
| Website credentials                              | CRITICAL | Secret exposure would compromise connected websites                      | Hash credentials; server-only SDK; rotation and audit logs                     |
| Public endpoint abuse                            | HIGH     | Forms/orders/bookings will be public                                     | Rate limits, validation, honeypots, idempotency where needed                   |
| Data migration                                   | HIGH     | Payload data and Drizzle placeholders differ                             | Build export/import jobs and verification reports                              |
| WordPress integration                            | MEDIUM   | Existing clients need tracking before deep connector                     | Start as registry/maintenance only                                             |
| Restaurant ordering                              | HIGH     | Orders require stronger consistency and operational UI                   | Build after Blog vertical slice proves platform API/SDK                        |

## 15. Recommended Implementation Order

### Milestone 1: V2 Architecture Freeze

Objective:

- Record the V2 target architecture and deprecation boundaries.

Scope:

- Docs only.
- No runtime changes.

Code areas affected:

- `docs`.

Acceptance criteria:

- V2 architecture decision record exists.
- V1 legacy areas are explicitly labeled.

Tests required:

- None.

Dependencies:

- This audit.

### Milestone 2: Website Type And Module Enablement Foundation

Objective:

- Add website type and enabled module foundation.

Scope:

- Additive schema plan and then implementation in a later coding milestone.

Code areas affected:

- `packages/database`
- `apps/dashboard/lib/dashboard/projects.ts`
- website dashboard pages.

Acceptance criteria:

- Websites can be WordPress, Sharoz Connected, or External / Legacy.
- Enabled modules can be stored per website.

Tests required:

- schema/service tests
- tenant isolation tests

Dependencies:

- V2 architecture freeze.

### Milestone 3: Platform API Foundation

Objective:

- Create stable server API boundary for connected websites.

Scope:

- API namespace, auth middleware for website credentials, error shape, rate limiting.

Code areas affected:

- new `apps/api` or dashboard API namespace
- `packages/auth`
- `packages/database`

Acceptance criteria:

- API can authenticate a website credential.
- API can reject disabled modules and wrong website scope.

Tests required:

- API auth tests
- credential hashing tests
- tenant isolation tests

Dependencies:

- module enablement foundation.

### Milestone 4: `@sharoz/sdk` Foundation

Objective:

- Provide typed server-side SDK for custom Next.js websites.

Scope:

- SDK client, auth headers, error handling, module namespaces.

Code areas affected:

- `packages/sdk`.

Acceptance criteria:

- SDK can call a test platform endpoint from a server-only context.

Tests required:

- SDK unit tests
- contract tests

Dependencies:

- Platform API foundation.

### Milestone 5: Blog Module Data Model

Objective:

- Build explicit Blog module backend.

Scope:

- `blog_posts`, categories, tags, authors, SEO/media links.
- Dashboard management UI.
- Permissions: `blog:read`, `blog:create`, `blog:update`, `blog:publish`.

Code areas affected:

- `packages/database`
- `packages/modules/blog`
- `apps/dashboard`
- `packages/auth`

Acceptance criteria:

- Client can manage blog posts for one website without Payload.

Tests required:

- module service tests
- permission tests
- tenant isolation tests

Dependencies:

- module enablement foundation.

### Milestone 6: First Connected Website Vertical Slice

Objective:

- Prove: Platform Blog module -> Platform API -> `@sharoz/sdk` -> custom Next.js website.

Scope:

- Example custom blog website with its own components/design.
- No platform-controlled sections/layout.

Code areas affected:

- `apps/examples/custom-blog-website`
- `packages/sdk`
- Platform API Blog endpoints.

Acceptance criteria:

- Website lists posts and renders a post from SDK data.
- Design is local to the website.
- Platform cannot alter layout.

Tests required:

- API contract tests
- SDK tests
- example build test

Dependencies:

- Blog module and SDK.

### Milestone 7: Forms, Media, SEO V2 Module Conversion

Objective:

- Convert existing Forms/Media/SEO work into V2 modules.

Scope:

- Formal module registration, API endpoints, SDK methods.

Code areas affected:

- `apps/dashboard/lib/dashboard/content-ops.ts`
- `apps/web/features/forms`
- `packages/lib/src/seo.ts`
- new module packages.

Acceptance criteria:

- Custom websites can submit forms and read SEO/media data without Payload.

Tests required:

- form API tests
- SEO contract tests
- abuse/rate-limit tests

Dependencies:

- Platform API and SDK.

### Milestone 8: WordPress / External Website Operations

Objective:

- Support existing maintenance clients operationally.

Scope:

- Website registry fields, care plan relation, health, backups, maintenance history.

Code areas affected:

- database
- dashboard website pages
- maintenance/care modules.

Acceptance criteria:

- Scenario A can be managed without pretending WordPress CMS integration exists.

Tests required:

- service tests
- dashboard route tests

Dependencies:

- website type foundation.

### Milestone 9: Restaurant Catalog And Orders Vertical Slice

Objective:

- Prove modular business backend beyond content.

Scope:

- Catalog, Orders, Customers modules.
- Platform API and SDK methods.
- Example restaurant custom website.

Code areas affected:

- new modules
- API
- SDK
- dashboard.

Acceptance criteria:

- Restaurant staff manage menu/products and incoming orders.
- Custom frontend remains independent.

Tests required:

- order consistency tests
- permissions tests
- API/SDK contract tests

Dependencies:

- Platform API, SDK, module registry.

## 16. Final Recommendation

Evolve this repository into V2.

Do not create a separate repository unless the team wants a clean brand/package namespace reset. The current repository already contains valuable foundations:

- monorepo infrastructure
- dashboard shell
- auth/RBAC
- organization/client model
- website/project model
- deployment/domain model
- forms/submissions foundation
- SEO utilities
- tests and docs

Starting from scratch would likely recreate these pieces and risk losing hard-won tenant isolation and operational patterns.

Safest pivot strategy:

1. Keep the repository.
2. Stop expanding the generic CMS/page-builder path.
3. Label Payload and `apps/web` as V1 legacy.
4. Add V2 module and API foundations additively.
5. Prove the custom Blog website vertical slice before touching restaurant orders.
6. Migrate away from Payload gradually after explicit modules exist.

The major architectural conclusion is blunt: the repository has a strong agency operations spine, but its current CMS renderer is the wrong center of gravity for V2. V2 should keep the spine and replace the CMS/page-builder center with explicit modules, a Platform API, and `@sharoz/sdk`.
