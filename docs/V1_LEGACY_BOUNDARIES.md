# V1 Legacy Boundaries

This document declares which V1 areas are frozen, transitional, reusable only with modification, or deprecated after migration for Sharoz Platform V2.

New V2 implementation must follow [ADR-001](adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md) and [V2 Architecture Guardrails](V2_ARCHITECTURE_GUARDRAILS.md).

## Classification Key

- **FROZEN LEGACY**: Keep for existing V1 behavior. Do not expand for V2.
- **TRANSITIONAL**: May stay temporarily while V2 replacements are built. Do not make it the center of new V2 architecture.
- **REUSE WITH MODIFICATION**: Concepts or utilities may be extracted, but direct dependency is not approved.
- **DEPRECATED AFTER MIGRATION**: Keep until migration, parity, and verification are complete.

## Boundaries

| Area                                             | Current Responsibility                                         | Conflict With V2                                                                | Classification             | May New V2 Code Depend On It? |
| ------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------- | ----------------------------- |
| `apps/cms`                                       | Payload CMS admin, collections, media, pages, posts, settings  | Makes Payload a content and layout center instead of explicit module APIs       | TRANSITIONAL               | No                            |
| `apps/web`                                       | Reusable public website renderer                               | Assumes one platform-owned frontend template for client websites                | FROZEN LEGACY              | No                            |
| `apps/web/features/blocks`                       | V1 block registry, block contracts, starter section rendering  | Stores and renders page section composition through platform-owned frontend     | FROZEN LEGACY              | No                            |
| `apps/web/features/layouts`                      | V1 reusable website layouts                                    | Couples public website presentation to the platform renderer                    | FROZEN LEGACY              | No                            |
| `apps/web/features/renderer`                     | V1 page/post/block rendering pipeline                          | Treats Payload content and block layout as the public website rendering source  | FROZEN LEGACY              | No                            |
| `apps/web/lib/payload`                           | Payload REST fetching for public renderer                      | Makes Payload look like the connected website data API                          | FROZEN LEGACY              | No                            |
| `apps/cms/src/blocks`                            | Payload block definitions for CMS layout editing               | Expands page-builder composition instead of explicit modules and SDK contracts  | FROZEN LEGACY              | No                            |
| Payload `Pages.layout`                           | Stores ordered page sections                                   | Platform must not store page section composition for Sharoz Connected websites  | DEPRECATED AFTER MIGRATION | No                            |
| Payload `Navigation`                             | CMS-managed header/footer/menu content                         | Navigation presentation belongs to each custom website                          | TRANSITIONAL               | No                            |
| Payload `SiteSettings`                           | CMS-managed brand, theme, analytics, and site settings         | Theme and public presentation settings should not be centralized as page layout | TRANSITIONAL               | No                            |
| `packages/database` `pages` table                | Placeholder page/content table                                 | Generic page-builder model is not the V2 module architecture                    | DEPRECATED AFTER MIGRATION | No                            |
| `packages/database` existing `posts` placeholder | Placeholder blog/content table                                 | Blog needs an explicit V2 Blog module model and API                             | DEPRECATED AFTER MIGRATION | No                            |
| Generic page-builder SEO assumptions             | SEO derived from pages, blocks, and Payload layout assumptions | V2 SEO must work through explicit module records and website-owned presentation | REUSE WITH MODIFICATION    | No direct dependency          |

## Notes

V1 legacy areas may remain in the repository to support existing tests, data inspection, and migration work. They must not be used as proof that V2 should continue the page-builder direction.

When useful behavior exists in a legacy area, extract the product contract into a V2 module rather than importing the V1 implementation directly.
