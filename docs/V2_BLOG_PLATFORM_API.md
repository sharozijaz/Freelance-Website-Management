# V2 Blog Platform API

Milestone 6 proves the first complete Sharoz Connected website vertical slice.

The Blog Platform API lets a custom coded website read Blog content from Sharoz Platform without importing dashboard code, database code, Payload, Drizzle, Better Auth, or a reusable public website renderer.

## Purpose

Sharoz Platform owns Blog content management.

Custom websites own Blog presentation.

The boundary is:

```text
Client Dashboard
      ->
Blog Domain
      ->
PostgreSQL
      ->
Platform API
      ->
@sharoz/sdk
      ->
Custom Website
```

This keeps the agency workflow intact:

```text
Figma design
-> custom website code
-> staging deployment
-> client review
-> production deployment
-> future content updates through Sharoz Platform
```

## Authentication

Blog Platform API routes require a website credential in the Authorization header:

```text
Authorization: Bearer <public_key>.<secret>
```

The Platform API authenticates the credential and derives the website principal server-side:

- organization id
- website id
- environment id
- environment type
- credential id
- credential label

Routes must not trust `organizationId`, `websiteId`, or `environment` values from query parameters, headers, request bodies, or SDK options.

## Website Principal

The website principal is machine identity for a connected website environment.

It is separate from dashboard user identity:

```text
Dashboard user
-> Better Auth
-> membership permissions
-> dashboard Blog mutations
```

```text
Custom website server
-> website credential
-> website principal
-> module authorization
-> Blog read API
```

Public websites are not dashboard members.

## Environment Visibility Policy

Visibility is centralized in the Blog Platform API service.

Production:

- returns published posts only.
- requires a valid `publishedAt`.
- excludes future published dates.
- excludes drafts.
- excludes archived posts.
- excludes soft-deleted posts.

Staging default:

- returns published posts only.
- excludes drafts unless preview is requested.
- excludes archived posts.
- excludes soft-deleted posts.

Staging preview:

```text
Staging Credential
      ->
Platform API
      ->
Staging Principal
      ->
preview=true allowed
      ->
Draft + Published
```

Production preview:

```text
Production Credential
      ->
Platform API
      ->
Production Principal
      ->
Published Only
```

`preview=true` is not authorization.

The credential environment is the authorization context. `preview=true` is only a visibility request, and it only widens results after the authenticated principal is known to be staging.

## Module Authorization

All Blog Platform API endpoints require the `blog` module to be enabled for the authenticated website.

If Blog is disabled, the endpoint returns the existing Platform API module-disabled error instead of returning fake empty content.

## Endpoints

Base path:

```text
/api/platform/v1/blog
```

### List Posts

```text
GET /api/platform/v1/blog/posts
```

Query parameters:

- `page`: positive integer, default `1`.
- `limit`: positive integer, default `10`, maximum `50`.
- `category`: optional category slug.
- `tag`: optional tag slug.
- `preview`: optional `true`.

Ordering:

```text
publishedAt DESC
createdAt DESC
id DESC
```

Drafts without `publishedAt` sort deterministically after published content by `createdAt` and `id`.

### Get Post By Slug

```text
GET /api/platform/v1/blog/posts/[slug]
```

The slug is URL-decoded by the route and checked inside the same tenant, website, module, and visibility policy.

Hidden content returns `NOT_FOUND`. The API does not reveal whether a draft, archived, deleted, cross-tenant, or cross-website slug exists.

### List Categories

```text
GET /api/platform/v1/blog/categories
```

Returns website-owned categories for the authenticated website. Empty categories are included because category management is website-owned taxonomy, not a visible-post search result.

### List Tags

```text
GET /api/platform/v1/blog/tags
```

Returns website-owned tags for the authenticated website. Empty tags are included for the same reason as categories.

## Response Contracts

Transport contracts live in `@sharoz/contracts`.

The API exposes transport-safe shapes:

- `BlogPostSummary`
- `BlogPost`
- `BlogCategory`
- `BlogTag`
- `BlogFeaturedMedia`
- `BlogPostListResponse`
- `BlogPostResponse`
- `BlogCategoryListResponse`
- `BlogTagListResponse`

The Platform API returns successful responses in the existing envelope:

```json
{
  "data": {}
}
```

Errors use the existing error envelope:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found."
  }
}
```

## Content Contract

Blog content is transported as structured Markdown:

```json
{
  "format": "markdown",
  "markdown": "# Article"
}
```

The Platform API does not render Markdown to HTML.

The SDK returns the structured content unchanged.

Custom websites choose their own Markdown renderer and must render user-authored Markdown safely.

Connected websites must not print `post.content.markdown` directly as plain text. They should parse Markdown into styled article UI using the website's own design system. At minimum, public websites should style headings, paragraphs, ordered and unordered lists, links, blockquotes, dividers, inline code, bold, italic, strike, and images. Featured media should be rendered separately as the article hero or cover image when present.

## Featured Media

Featured media is nullable.

The transport exposes only:

- `id`
- `url`
- `altText`
- `width`
- `height`
- `mimeType`

The URL is only populated when `media_assets.metadata.publicUrl` contains a safe `http` or `https` URL.

The API does not expose:

- storage keys
- filesystem paths
- provider credentials
- secret metadata
- internal media metadata unrelated to website rendering

If a media asset has no safe public URL, `featuredMedia.url` is `null`.

## SDK Usage

`@sharoz/sdk` exposes Blog methods:

```ts
const posts = await client.blog.posts.list({
  page: 1,
  limit: 10,
});

const post = await client.blog.posts.getBySlug("hello-world", {
  preview: true,
});

const categories = await client.blog.categories.list();
const tags = await client.blog.tags.list();
```

SDK Blog options do not include environment, organization ID, or website ID.

The credential determines those identities.

## Server-Only Credentials

Connected websites should configure the SDK on the server:

```text
SHAROZ_API_BASE_URL
SHAROZ_PUBLIC_KEY
SHAROZ_SECRET
```

Do not use:

- `NEXT_PUBLIC_SHAROZ_SECRET`
- `NEXT_PUBLIC_SHAROZ_PUBLIC_KEY`
- browser local storage
- browser session storage
- credential query parameters
- client-side authenticated SDK calls

## Connected Website Example

The reference application lives at:

```text
apps/example-connected-blog
```

It provides:

- `/blog`
- `/blog/[slug]`
- server-side SDK configuration
- a staging preview request through `/blog/[slug]?preview=true`
- local presentation owned by the website
- architecture tests that prevent imports from dashboard, database, Drizzle, Payload, Better Auth, and dashboard Blog services

It is not:

- a reusable public website renderer
- a page builder
- a theme engine
- a starter client website product

## Staging Setup

Use staging credentials in the connected website environment:

```text
SHAROZ_API_BASE_URL=http://localhost:3000
SHAROZ_PUBLIC_KEY=spk_...
SHAROZ_SECRET=sps_...
```

For preview:

```text
/blog/hello-world?preview=true
```

The website server passes `preview: true` to the SDK.

The Platform API only widens visibility when the authenticated credential belongs to a staging environment.

A public staging deployment should be protected separately in a future milestone if client-private preview is required.

## Production Setup

Use production credentials in production deployments.

Production credentials return published content only, even when `preview=true` is sent.

## Tenant Isolation

Every Blog query is scoped by the trusted platform request context:

- `organizationId`
- `websiteId`

Category and tag filtering remains tenant-safe:

- unknown slugs return empty results.
- slugs from another website return empty results.
- slugs from another tenant return empty results.

## Error Behavior

The Blog API uses existing Platform API errors:

- `UNAUTHORIZED`
- `INVALID_REQUEST`
- `MODULE_NOT_ENABLED`
- `NOT_FOUND`
- `INTERNAL_ERROR`

Hidden posts return `NOT_FOUND`.

Raw SQL, Drizzle errors, stack traces, credential hashes, and plaintext secrets are not returned.

## Known Limitations

- Pagination is page-based, not cursor-based.
- Category and tag filtering is implemented in the service boundary after tenant-safe scoped reads.
- Featured media depends on a safe `metadata.publicUrl`; no media storage provider was added.
- The example website renders Markdown source safely as text instead of adding a Markdown renderer.
- No live PostgreSQL E2E test is included.
- No preview token system exists.
- No deployment, DNS, SSL, cPanel, or Vercel automation is included.

## Non-Goals

Milestone 6 does not build:

- Catalog
- Orders
- Booking
- Payload content architecture
- a page builder
- a block engine
- a reusable website renderer
- a universal website template
- a public website design system
- deployment automation
- DNS automation
- SSL automation

## Recommended Next Milestone

The next milestone should harden operational usage around the connected website path:

- seed/demo data for a local end-to-end Blog test
- optional staging site access control
- production-ready media public URL strategy
- dashboard guidance for issuing staging and production credentials
