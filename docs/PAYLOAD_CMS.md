# Payload CMS Foundation

> **V2 legacy notice:** This document describes the V1 Payload CMS foundation. In V2, Payload is **LIMITED USE / TRANSITIONAL** and must not become the Platform API or the source of public website page section composition. See [ADR-001](adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md) and [V1 Legacy Boundaries](V1_LEGACY_BOUNDARIES.md).

Milestone 6 establishes the Payload CMS architecture for the Agency Website Platform. It does not implement the visual page builder, dashboard screens, website rendering, or business workflows.

## Architecture

The CMS lives in `apps/cms` and exports a typed Payload configuration from `src/payload.config.ts`.

Core integrations:

- Payload CMS for content modeling.
- Payload Postgres adapter for PostgreSQL persistence.
- Lexical rich text for editorial content.
- Sharp for image processing and responsive image generation.
- Existing organization architecture through `organizationId` tenant fields.
- Existing RBAC helpers from `@agency/auth`.

Payload collections are tenant-owned with an `organizationId` field. This keeps CMS content aligned with the platform database foundation without duplicating the existing `organizations` table as a Payload collection.

## Collections

### Pages

Pages support title, slug, workflow status, SEO, featured image, publish date, author, scheduled publishing, preview URL, revisions, drafts, and a `layout` placeholder.

The `layout` field is intentionally JSON for now. It reserves the content shape for the future block-based page builder without introducing block implementations in this milestone.

### Posts

Posts support Lexical rich text, featured image, categories, tags, author, reading time, related posts, drafts, revisions, SEO, and scheduled publishing.

### Categories and Tags

Categories and tags organize posts and future content types. Both are tenant-scoped and include SEO metadata for archive pages.

### Authors

Authors represent editorial profiles. They can optionally map to an existing platform user through `userId`, but they are not authentication records.

### Media

Media supports images, videos, PDFs, folders via `folderPath`, alt text, captions, focal point, metadata, image optimization, and responsive image sizes.

Configured image sizes:

- `thumbnail`
- `card`
- `hero`
- `full`

### Navigation

Navigation supports header, footer, and custom menus with nested links. Links can point to URLs or Payload pages.

### Redirects

Redirects support tenant-owned 301 and 302 redirects. They are managed with publish-level permissions because redirects affect public routing.

### Site Settings

`site-settings` is a tenant-scoped collection for client website configuration:

- Brand
- Logo
- Favicon
- Theme tokens
- Contact information
- Social links
- Analytics IDs

This is a collection rather than a singleton global so every organization can maintain independent website settings.

## Globals

`platform-settings` is a Payload global for platform-wide CMS defaults. Tenant-specific website settings remain in the `site-settings` collection.

## Shared Fields

Reusable field definitions live in `apps/cms/src/fields`:

- `organizationField`
- `slugField`
- `richTextField`
- `featuredImageField`
- `authorField`
- `publishFields`
- `seoField`
- `themeField`
- `linkFields`

This avoids duplicated field definitions and keeps future changes consistent across content types.

## Authorization

CMS access rules live in `apps/cms/src/access` and reuse `@agency/auth`.

Access is organization-aware:

1. Read the active organization from the authenticated CMS user context.
2. Find the user's active membership for that organization.
3. Evaluate platform permissions through shared RBAC helpers.
4. Scope reads to the active `organizationId`.
5. Reject writes that attempt to cross organization boundaries.

The CMS does not define a separate authentication system. Future app mounting should populate Payload request user context from the existing Better Auth session.

## SEO Strategy

The reusable SEO group supports:

- Meta title
- Meta description
- Canonical URL
- Social image
- Open Graph title, description, and type
- Twitter card
- Robots index/follow
- Schema JSON placeholder

The schema field is intentionally a placeholder for future AI SEO and structured data automation.

## Media Strategy

Payload owns uploaded assets and image transformations. The media model stores editorial metadata while Sharp generates reusable responsive sizes.

The `focalPoint` and `metadata` fields prepare website rendering for art-directed crops, video metadata, PDF metadata, and provider-specific information.

## Future Page Builder

The future visual page builder will replace the `layout` JSON placeholder with Payload Blocks.

Expected path:

1. Build reusable section components in `packages/ui`.
2. Register matching Payload block definitions.
3. Update `Pages.layout` from JSON placeholder to a typed blocks field.
4. Preserve existing pages by migrating layout JSON into block rows.
5. Render pages by composing registered sections from CMS content.

This milestone deliberately stops before block implementation so the CMS foundation can stabilize first.
