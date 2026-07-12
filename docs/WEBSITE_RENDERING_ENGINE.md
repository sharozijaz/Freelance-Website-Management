# Website Rendering Engine

Milestone 7 adds `apps/web`, the reusable Next.js website template for future client websites. It renders tenant-scoped content from Payload CMS without implementing the visual page builder.

## Rendering Pipeline

1. Resolve the tenant from the incoming request and `WEB_ORGANIZATION_ID`.
2. Load site settings, header navigation, and footer navigation from Payload.
3. Resolve the requested page or blog post by slug.
4. Generate metadata from CMS SEO fields.
5. Select a layout through the layout registry.
6. Render the page or post with shared UI components.
7. Render stored structured data when available.

The page-builder `layout` field is treated as a placeholder. The renderer has a `BlockRenderer` seam ready for future Payload Blocks, but no blocks are implemented in this milestone.

## Data Flow

Payload access lives in `apps/web/lib/payload`.

- `client.ts` contains the shared Payload REST fetch wrapper.
- `queries.ts` contains reusable fetch functions for pages, posts, navigation, site settings, and media.
- `types.ts` defines the content shapes consumed by the renderer.

All tenant-owned queries include `organizationId` filters. If no tenant is configured, the app renders an empty tenant state instead of hardcoding content.

## SEO Flow

SEO utilities live in `apps/web/lib/seo.ts`.

The renderer supports:

- Next.js Metadata API
- Meta title
- Meta description
- Canonical URL
- Open Graph
- Twitter Card
- Robots index/follow flags
- Structured data placeholder
- Sitemap placeholder
- Robots placeholder

Breadcrumb generation is intentionally left as a placeholder for the future navigation and page hierarchy milestone.

## Caching Strategy

The renderer uses:

- ISR with `revalidate = 300`.
- Fetch cache tags such as `payload:pages`, `payload:posts`, and tenant-specific tags.
- Draft mode for preview requests.
- Dynamic rendering where request context is needed.
- Static params where `WEB_ORGANIZATION_ID` is available at build time.

Future Payload hooks can call Next revalidation endpoints using these tags when content changes.

## Layouts

Initial reusable layouts:

- Default
- Landing Page
- Blog
- Article

Layouts are selected in `features/renderer/layout-registry.ts`. New layouts can be added by creating a layout component and registering the selection rule.

## Error Handling

The app includes:

- `not-found.tsx`
- `error.tsx`
- `global-error.tsx`
- `loading.tsx`
- Empty content states

These states let tenant sites fail gracefully when content, tenant configuration, or Payload data is missing.

## Future Page Builder Integration

The future page builder will replace the current `BlockRenderer` placeholder with a section registry:

1. Payload stores typed Blocks in `Pages.layout`.
2. Each block type maps to a section in the shared UI/section library.
3. The renderer receives ordered blocks from Payload.
4. The renderer looks up each block in the registry.
5. Registered sections render with tenant theme tokens and CMS content.

This prepares the project for the Section Library and Page Builder because the app already has tenant resolution, CMS data access, layout selection, SEO, preview mode, cache boundaries, and renderer composition in place.
