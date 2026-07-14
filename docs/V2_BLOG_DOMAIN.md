# V2 Blog Domain

Sharoz Platform V2 Blog is the first explicit business/content module.

The Blog module owns article data. The custom website owns article presentation.

## Responsibility

Blog stores:

- title
- slug
- excerpt
- article content
- featured media reference
- status
- author user reference
- publication timestamp
- SEO fields
- categories
- tags
- timestamps

Blog does not store React components, Tailwind classes, layouts, card variants, grid settings, hero composition, page sections, or public templates.

## Legacy CMS Boundary

The V2 Blog domain does not reuse the legacy `posts` placeholder table, Payload Posts, Payload Pages, or Payload layout blocks.

The legacy Drizzle `posts` table is too thin for V2 Blog. It only contains basic title, slug, status, author, publication timestamp, and timestamps. It lacks explicit excerpt, content document, featured media, category/tag relationships, SEO fields, and complete workflow behavior.

V2 Blog therefore uses Blog-prefixed tables and leaves all legacy CMS records untouched.

## Data Model

Tables:

- `blog_posts`
- `blog_categories`
- `blog_post_categories`
- `blog_tags`
- `blog_post_tags`

Every Blog record is scoped by `organization_id` and `website_id`.

The database enforces website/organization consistency through composite foreign keys to `websites(id, organization_id)`.

Post slugs are unique per website.

Category slugs are unique per website.

Tag slugs are unique per website.

## Content Storage Decision

Post content is stored as structured JSON:

```json
{
  "format": "markdown",
  "markdown": "# Article"
}
```

Markdown was chosen for V2 foundation because it is portable, easy to edit with a textarea, safe to transport through the future SDK, and does not imply platform-owned frontend rendering.

Future editor upgrades can add a richer editor while preserving the transport shape or migrating intentionally.

## SEO Strategy

Blog posts contain explicit practical SEO fields:

- `seo_title`
- `meta_description`
- `canonical_url`
- `robots_index`
- `robots_follow`

This keeps the future Blog API and SDK contract clean without depending on the generic `seo_metadata` resource table.

Open Graph image initially reuses `featured_media_id`.

## Featured Media Strategy

Blog posts may reference `media_assets`.

The service validates that media belongs to the same organization and either:

- the same website, or
- organization-level shared media with `website_id` null.

Cross-tenant and cross-website media references are rejected.

The Blog Platform API exposes only safe featured media fields for connected websites:

- id
- public URL when `metadata.publicUrl` is a safe `http` or `https` URL
- alt text
- width
- height
- MIME type

Storage keys, provider credentials, filesystem paths, and unrelated metadata are not part of the transport contract.

## Post Lifecycle

Statuses:

- `draft`
- `published`
- `archived`

Draft posts have `published_at` null.

Publishing sets status to `published` and sets `published_at` when first published.

Unpublishing moves a post back to `draft` and clears `published_at`. This makes the current public availability state unambiguous for the future API.

Archiving sets status to `archived`. Archived posts are not intended for future public list endpoints.

Soft deletion sets `deleted_at`; normal lists exclude deleted posts.

Scheduled publishing, approval workflow, and revisions are future work.

The Platform API applies public visibility centrally:

- production credentials see published posts with valid non-future `published_at` only.
- staging credentials see published posts by default.
- staging credentials may request `preview=true` to include drafts.
- archived and soft-deleted posts are always hidden from Platform API reads.

`preview=true` is only a visibility request. It is not authorization.

## Slug Behavior

Slugs are lowercase, URL-safe, trimmed, and separator-normalized.

If a slug is omitted, it is generated from the title.

Slugs remain manually editable.

Redirect history is not implemented in this milestone.

## Categories

Blog categories are explicit Blog records, not generic taxonomies.

Categories belong to one organization and one website.

Assigned categories cannot be deleted. The user must detach them from posts first.

## Tags

Blog tags are explicit Blog records, not generic global tags.

Tags belong to one organization and one website.

Assigned tags cannot be deleted. The user must detach them from posts first.

## Permission Matrix

Capabilities:

- `blog:read`
- `blog:create`
- `blog:update`
- `blog:publish`
- `blog:delete`

Default roles:

| Role         | Blog Permissions                      |
| ------------ | ------------------------------------- |
| Agency Owner | read, create, update, publish, delete |
| Agency Admin | read, create, update, publish, delete |
| Client Admin | read, create, update, publish, delete |
| Editor       | read, create, update, publish         |
| Writer       | read, create, update                  |
| Viewer       | read                                  |

Services use capability checks. They do not compare role names directly.

## Module Enablement

Every Blog operation requires:

- authenticated dashboard session
- active membership
- required Blog capability
- target website access
- website type `sharoz_connected`
- enabled `blog` module for the website

Navigation hiding is UX only. Server-side enforcement is mandatory.

## Dashboard Routes

Website-local Blog routes:

- `/websites/[websiteId]/blog`
- `/websites/[websiteId]/blog/new`
- `/websites/[websiteId]/blog/[postId]`
- `/websites/[websiteId]/blog/categories`
- `/websites/[websiteId]/blog/tags`

Dashboard actions:

- create post
- update post
- publish post
- unpublish post
- archive post
- delete post
- create/update/delete categories
- create/update/delete tags

## Audit Events

Events:

- `blog_post.created`
- `blog_post.updated`
- `blog_post.published`
- `blog_post.unpublished`
- `blog_post.archived`
- `blog_post.deleted`
- `blog_category.created`
- `blog_category.updated`
- `blog_category.deleted`
- `blog_tag.created`
- `blog_tag.updated`
- `blog_tag.deleted`

Audit metadata stores small identifiers such as website ID, title, slug, and status.

Full article content and large excerpts are not stored in audit metadata.

## Intended Future Architecture

```text
Dashboard Blog Editor
-> Blog Application Service
-> Blog Domain Tables
```

```text
Custom Next.js Website Server
-> @sharoz/sdk
-> Platform API
-> Website Authentication
-> Blog Module Authorization
-> Blog Application Service
-> Blog Domain Tables
```

Milestone 6 implements the connected website read side through:

- Blog transport contracts in `@sharoz/contracts`
- Blog Platform API routes under `/api/platform/v1/blog`
- Blog SDK methods under `client.blog`
- the minimal reference app in `apps/example-connected-blog`

## Non-Goals

The Blog domain milestone did not implement:

- Payload Blog migration
- scheduled publishing
- revisions
- approval workflows
- public page templates
- frontend layout settings
- generic collections
- generic taxonomies

## Known Limitations

- The editor is a Markdown textarea foundation.
- Featured media selection is currently by media asset UUID.
- No live PostgreSQL E2E verification was performed unless a local `DATABASE_URL` is configured.
- Blog Platform API pagination is currently page-based.
- The connected website example renders Markdown source safely as text rather than providing a full Markdown rendering stack.

Next milestone:

**Post-Milestone 6 — Connected website operational hardening**
