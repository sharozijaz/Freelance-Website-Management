# V2 Architecture Guardrails

These rules are for future Codex sessions and human contributors working on Sharoz Platform V2.

## Do

- Build explicit domain models for each module.
- Scope business data by `organization_id` and `website_id`.
- Use capability permissions for module actions.
- Keep dashboard session authentication separate from website credential authentication.
- Expose connected website data through Platform APIs.
- Consume platform data from connected websites through the future `@sharoz/sdk`.
- Keep custom public website UI local to each website repo or app.
- Use additive migrations during V2 transition work.
- Test tenant isolation.
- Test disabled module access.
- Keep server credentials server-only.
- Treat Payload and `apps/web` as V1 legacy/transitional systems.
- Design module APIs before wiring dashboard screens.

## Do Not

- Do not build a page builder as V2 architecture.
- Do not create generic collections for unrelated business domains.
- Do not store React definitions in the database.
- Do not store Tailwind classes as CMS layout architecture.
- Do not make Payload the Platform API.
- Do not let websites query the platform database directly.
- Do not expose website credentials to browser JavaScript.
- Do not use role-name comparisons when capability checks exist.
- Do not make Blog, Catalog, Orders, and Booking share generic `content_entries`.
- Do not expand `apps/web` as the V2 starter.
- Do not make `@agency/ui` a public website dependency.
- Do not make new V2 features depend on Payload page layout blocks.
- Do not make new V2 features depend on the `apps/web` block renderer.

## Required Checks For V2 Features

Before a V2 feature is considered complete, confirm:

- The owning module is named.
- The domain model is explicit.
- `organization_id` scope is enforced.
- `website_id` scope is enforced for website-owned records.
- Permissions are expressed as capabilities.
- Disabled module behavior is defined.
- API contracts are documented.
- SDK contract impact is documented.
- Dashboard browser session auth and website credential auth are not mixed.
- No V1 page-builder dependency was introduced.
