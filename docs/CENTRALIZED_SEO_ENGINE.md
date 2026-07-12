# Centralized SEO Engine

Milestone 15 adds a centralized, website-aware SEO operations layer. The platform does not crawl external sites or compete with enterprise SEO tools. It validates SEO data already controlled by the Agency Website Platform.

## Architecture

SEO logic lives in `@agency/lib/seo` and is consumed by:

- website metadata generation
- structured data generation
- sitemap generation
- robots generation
- dashboard SEO operations
- attention mapping

Blocks do not own page-level SEO metadata. Content and website settings flow into a shared normalizer, then downstream surfaces consume the normalized output.

## Fallback Hierarchy

Title resolution:

1. Explicit content SEO title
2. Content title with website title template
3. Website site title
4. Generic website fallback

Description resolution:

1. Explicit content meta description
2. Post excerpt when available
3. Website default meta description

Image resolution:

1. Twitter image override where supported
2. Content social image
3. Featured image
4. Website default Open Graph image

Robots resolution:

1. Content robots overrides
2. Website robots defaults
3. Index and follow enabled

Canonical resolution:

1. Explicit canonical override when valid
2. Website canonical base URL plus page/post path
3. No canonical when neither can safely resolve

Only HTTPS absolute canonical overrides are accepted. Relative canonical overrides are resolved against the website base URL.

## Rules Implemented

The initial rule engine supports:

- missing SEO title
- SEO title too short
- SEO title too long
- missing meta description
- meta description too short
- meta description too long
- missing canonical URL
- invalid canonical URL
- published content marked noindex
- missing Open Graph image
- missing H1 where detectable from supported blocks
- multiple H1 headings where detectable from supported blocks
- empty page content
- duplicate slug
- duplicate SEO title
- duplicate meta description
- image missing alt text in dashboard media operations

H1 detection is intentionally limited to supported block structures, currently Hero blocks. The engine does not pretend to parse arbitrary custom HTML or external rendered pages.

## Findings Strategy

Findings are calculated on demand from current platform data. They are not persisted in Version 1 of the SEO engine.

This avoids stale findings and unnecessary background infrastructure. If future websites require scheduled scans or history, the same rule output can be cached or persisted with invalidation on Payload content changes.

## Dashboard Workflow

The dashboard includes:

- agency SEO overview at `/seo`
- website SEO overview at `/websites/[websiteId]/seo`
- severity, resource type, and rule filters
- CMS action links for page, post, and media fixes
- SEO settings workflow link into Payload Site Settings

The dashboard does not duplicate the CMS editor. Payload remains the source for SEO metadata editing.

## Sitemap and Robots

Sitemaps include published pages and posts only when a valid canonical URL exists and the normalized robots directive allows indexing.

Robots output blocks indexing for preview and non-production environments. Production behavior uses website robots defaults where available and always references the sitemap.

## Structured Data

The renderer generates centralized JSON-LD for:

- Organization
- WebSite
- WebPage
- Article
- BreadcrumbList
- FAQPage when FAQ block content is eligible

Structured data is serialized from normalized objects. Custom HTML blocks do not control global structured data.

## Permissions

SEO overview reads use the existing `cms:read` tenant-aware permission. SEO settings edits route to Payload and rely on existing `seo:manage` and settings permissions there. Agency-wide views remain scoped by the same organization membership rules as the rest of the dashboard.
