# ADR-001: V2 Platform Architecture

## Status

Accepted

## Date

2026-07-13

## Context

The repository began as a reusable agency website platform with a Payload CMS application, a reusable `apps/web` renderer, shared UI components, a block engine, starter sections, dashboard operations, authentication, and database foundations.

The V2 strategy changes the center of gravity. Sharoz Platform is not a generic page-builder product. It is an agency control plane plus modular website services used by many custom-built websites.

The platform must support agencies that build highly custom public websites while still centralizing operational concerns such as websites, domains, deployments, media, forms, SEO, analytics, modules, users, permissions, and future AI workflows.

## Decision

Sharoz Platform V2 will evolve this repository into a modular platform with three clear responsibilities:

1. Agency control plane.
2. Modular website services.
3. Developer platform API and SDK.

Custom public websites own presentation. The platform must never require public websites to use `@agency/ui` or the dashboard design system. The platform must never store page section composition for Sharoz Connected websites.

Connected websites communicate through Platform API contracts and the future `@sharoz/sdk`. Website-specific React components remain inside each website repo or app.

Payload CMS is **LIMITED USE / TRANSITIONAL**. The existing `apps/web` application is the **V1 legacy renderer**. No new V2 feature may depend on Payload page layout blocks or the `apps/web` block renderer architecture.

## Architectural Principles

- Platform-owned data must be explicit, typed, permissioned, and tenant-scoped.
- Modules own domain data, validation, permissions, API contracts, SDK contracts, and events.
- Public websites own HTML, CSS, React components, route structure, and visual presentation.
- Dashboard UI foundations can be shared across internal platform applications, but they must not become a requirement for custom public websites.
- V2 work should be additive until migration paths are proven.
- Tenant isolation is a product rule and a security rule.
- Runtime credentials used by websites must be separate from dashboard browser sessions.

## System Boundaries

### Agency Control Plane

The agency control plane owns:

- Organizations and memberships.
- Website records and website type.
- Module enablement.
- Domains and deployment records.
- Dashboard navigation and operational screens.
- Agency and client user permissions.
- Audit logging and administrative workflows.

The control plane does not own public website presentation.

### Modular Website Services

Modules own specific business capabilities such as Blog, Forms, SEO, Media, Catalog, Booking, Analytics, and future vertical modules.

Each module must own:

- Domain data.
- Validation rules.
- Capability permissions.
- Platform API contracts.
- SDK contracts.
- Events and audit boundaries.
- Tenant and website scoping rules.

Modules must not share one generic `content_entries` model for unrelated business domains.

### Developer Platform

The developer platform exposes safe contracts for connected websites.

Connected websites must communicate through:

- Platform APIs.
- The future `@sharoz/sdk`.
- Server-side website credentials.

Connected websites must not query the platform database directly.

### Public Website Responsibility

Custom public websites own:

- React components.
- Layouts.
- Styling.
- Routes.
- Section composition.
- Animations.
- Brand-specific UI decisions.

The platform may provide data, SDK helpers, operational APIs, and examples. It must not force public websites to render with `@agency/ui`, Tailwind classes stored in CMS records, Payload layout blocks, or the V1 `apps/web` renderer.

## Legacy V1 Boundary

V1 page-builder architecture is frozen as legacy.

The following areas are legacy or transitional:

- `apps/cms`
- `apps/web`
- `apps/web/features/blocks`
- `apps/web/features/layouts`
- `apps/web/features/renderer`
- `apps/web/lib/payload`
- `apps/cms/src/blocks`
- Payload `Pages.layout`
- Payload `Navigation`
- Payload `SiteSettings`

V1 tables and applications must not be destructively removed during early V2 milestones. They should remain available until explicit replacement modules, migration scripts, and verification steps exist.

## Payload Decision

Payload is **LIMITED USE / TRANSITIONAL**.

Payload may remain available for V1 content, migration support, media review, and historical compatibility. It must not become the V2 Platform API. It must not own V2 page layout, V2 public website rendering, V2 module contracts, or Sharoz Connected website presentation.

No new V2 feature may depend on Payload page layout blocks.

## Data Ownership

Drizzle-owned platform tables are the preferred source of truth for V2 platform and module data.

Every website-owned business record must be scoped by:

- `organization_id`
- `website_id`

This applies to module data such as posts, forms, submissions, catalog items, bookings, analytics events, SEO records, and future website-owned business entities.

## Authentication Boundaries

Better Auth browser sessions are for dashboard users.

Website API credentials are a separate future authentication boundary. They must be designed for server-to-server usage by connected websites and must not be exposed to browser JavaScript.

Dashboard session authorization and website credential authorization must remain separate even when they resolve to the same organization and website.

## Tenant Isolation Rules

- Every organization-owned platform record must include an organization scope.
- Every website-owned business record must include both organization and website scope.
- APIs must derive tenant access from the authenticated dashboard session or validated website credential.
- Queries must enforce tenant scope at the service boundary.
- Tests must cover cross-organization access denial.
- Tests must cover disabled module access denial.

## Module Rules

Every V2 module must define:

- Domain model.
- Capability permissions.
- Validation rules.
- Platform API routes or service contracts.
- SDK contract.
- Audit events.
- Tenant isolation behavior.
- Disabled-module behavior.

Modules must not store React component definitions, Tailwind layout classes, or page section composition as their core architecture.

## Consequences

Positive consequences:

- Custom website design remains flexible.
- The platform becomes more durable because business data is explicit.
- Agencies can serve many website types without forcing one frontend template.
- Platform APIs and SDKs become the integration surface.
- V1 can keep running while V2 is built safely.

Tradeoffs:

- V2 requires explicit module design instead of a generic CMS shortcut.
- Migration from Payload must be planned module by module.
- The platform needs a separate website credential model.
- Existing V1 docs and apps require clear legacy labels.

## Rejected Alternatives

### Continue With Payload Page Builder As The V2 Core

Rejected because V2 requires custom public websites that own presentation and consume platform services through APIs and SDKs.

### Make `apps/web` The V2 Starter Website

Rejected because `apps/web` is coupled to Payload pages, layouts, blocks, navigation, and site settings.

### Require `@agency/ui` In Public Websites

Rejected because custom public websites must be free to use local design systems and bespoke presentation.

### Use One Generic Content Table For All Modules

Rejected because Blog, Catalog, Orders, Booking, Forms, and other modules need different validation, permissions, APIs, and lifecycle rules.

### Remove V1 Immediately

Rejected because early V2 milestones must avoid destructive migration risk.

## Migration Strategy

1. Freeze and label V1 CMS/page-builder boundaries.
2. Keep V1 apps and tables during early V2 milestones.
3. Build V2 website type and module enablement foundations additively.
4. Create explicit V2 module models and APIs one module at a time.
5. Introduce the future `@sharoz/sdk` as the website integration layer.
6. Add server-side website credential authentication.
7. Migrate useful V1 data into explicit V2 modules only after replacement flows exist.
8. Deprecate Payload page layout and `apps/web` rendering after parity and verification.

The next implementation milestone is **V2 Milestone 2 — Website Type and Module Enablement Foundation**.
