# CMS Block Integration And Page Composition

> **V2 legacy notice:** This document describes V1 Payload page composition. V2 must not store page section composition for Sharoz Connected websites and no new V2 feature may depend on Payload `Pages.layout` blocks or the `apps/web` block renderer. See [ADR-001](adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md) and [V2 Architecture Guardrails](V2_ARCHITECTURE_GUARDRAILS.md).

Milestone 10 connects Payload CMS page composition to the website renderer without introducing a second frontend registry.

## Content Lifecycle

```txt
Figma Design
  -> Codex Component
  -> Block Registration
  -> Payload Block Configuration
  -> CMS Page Composition
  -> Draft Preview
  -> Publishing
  -> Cache Revalidation
  -> Website Rendering
```

1. A reusable section is created in the website block system.
2. The section registers with the frontend Block Registry.
3. Payload receives a CMS block configuration with the same block slug.
4. Editors create or edit a page in Payload.
5. Editors add, reorder, remove, and configure Payload Blocks in the `layout` field.
6. Payload saves drafts and revisions through native Payload versioning.
7. Payload generates a signed preview URL for the page.
8. The website preview route verifies the token and enables draft mode.
9. Published page changes call the website revalidation endpoint.
10. The website renders the latest page through the normalized block pipeline.

## Page Composition

The `pages` collection now uses a native Payload `blocks` field for `layout`.

Included starter blocks:

- Hero
- Logo Cloud
- Feature Grid
- Services
- Statistics
- Testimonials
- Pricing
- FAQ
- CTA
- Footer

Payload handles the editor experience for adding, reordering, removing, and configuring blocks. No custom drag-and-drop editor is introduced in this milestone.

## Mapping Pipeline

```txt
Payload Block Data
  -> apps/web/features/blocks/payload-block-adapter.ts
  -> Normalized CmsBlock
  -> Block Registry
  -> React Section Component
```

Payload stores blocks as flat objects with `blockType`. The website renderer uses a reusable `CmsBlock` contract with `type` and `content`.

The adapter is intentionally small and explicit:

- `blockType` becomes `type`
- non-metadata Payload fields become `content`
- shared settings remain on `theme`, `responsive`, `animation`, `seo`, and `visibility`
- Payload label arrays are normalized for frontend section props where needed

React section components do not import Payload-generated types and remain reusable outside Payload.

## Registry Source Of Truth

The frontend Block Registry remains the rendering source of truth.

Payload has CMS-specific field configuration because Payload requires field definitions for its admin UI. This is the unavoidable schema duplication in this milestone. The duplication is limited to editor field configuration; rendering names, runtime resolution, and component selection still happen through the Block Registry.

## Draft Preview

Preview URLs are signed and tenant-scoped.

Payload generates:

```txt
/api/preview?token=<signed-token>
```

The token includes:

- organization id
- path
- expiration timestamp

The website preview route verifies the signature, checks the tenant when `WEB_ORGANIZATION_ID` is configured, enables Next.js draft mode, and redirects to the page path.

Draft content is not exposed through normal public routes. It is available only after a valid signed preview token enables draft mode.

## Publishing And Revalidation

When a page is published, Payload calls the website revalidation endpoint with a short-lived signed token.

The website revalidates:

- the page path
- `payload:pages`
- `tenant:<organizationId>`
- `page:<slug>`

Normal content updates do not require a full website rebuild.

## Routing Rules

Supported page routes:

- `/`
- `/about`
- `/services`
- `/custom-slug`
- nested future-ready slugs such as `/services/design`

Slug handling:

- `home` maps to `/`
- duplicate slugs are rejected within the same organization
- slugs are normalized by trimming leading and trailing slashes
- reserved segments are rejected: `admin`, `api`, `blog`, `_next`, `sitemap.xml`, `robots.txt`
- blog routes remain separate and are not overwritten by pages

## Tenant Isolation

Page queries require `organizationId`.

If `WEB_WEBSITE_ID` is configured, page queries are further scoped by `websiteId`. This prepares the renderer for multiple websites inside one organization while preserving current organization-level tenant isolation.

The website never resolves pages by slug alone.

## SEO Flow

Payload page SEO fields continue to feed the existing website SEO utility.

Published pages generate:

- title
- meta description
- canonical URL
- Open Graph metadata
- Twitter metadata
- robots directives

SEO logic remains centralized in `apps/web/lib/seo.ts`.

## Sample Test Page

To manually verify the workflow, create a Payload page:

- Title: `Milestone 10 Test Page`
- Slug: `milestone-10-test`
- Organization ID: match `WEB_ORGANIZATION_ID`
- Website ID: match `WEB_WEBSITE_ID` if configured
- Layout:
  - Hero with headline and CTA
  - Feature Grid with at least two feature cards
  - Pricing with one highlighted plan
  - FAQ with two questions
  - CTA with one button

Expected result:

- draft saves successfully
- preview URL opens `/milestone-10-test`
- block order is preserved
- published page renders through `apps/web`
- metadata comes from the page SEO fields
- requests for another organization do not return the page

## Adding A New Section

1. Add the React section and `BlockDefinition` to the frontend block system.
2. Register it in `starterBlockDefinitions` or a future section pack.
3. Add a Payload block config with the same block slug.
4. Add adapter normalization only if Payload field shape differs from the frontend content shape.
5. Add tests for normalization and registry resolution.
6. Update this documentation with any schema duplication or migration notes.

## Known Limitations

- Payload field config is manually maintained because Payload needs CMS-specific field definitions.
- No custom visual editor or live drag-and-drop canvas is implemented.
- Preview access is signed-token based; deeper authenticated preview auditing can be added when the dashboard workflow exists.
- Scheduled publishing relies on Payload's draft scheduling support; no separate operational scheduler UI is added in this milestone.
