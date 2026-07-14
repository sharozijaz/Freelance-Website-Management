# V2 Media Platform

## Domain Boundary

The Media module manages website-scoped media asset metadata for Sharoz Connected websites. It does not store binary files in PostgreSQL and does not own provider-specific file deletion in V2 Milestone 9.

Media assets belong to one organization and one website. Dashboard users manage them through website-scoped permissions. Connected websites read them through credential-derived Platform API identity.

## Asset Model

Media assets use the existing `media_assets` database table:

- `organizationId` enforces tenant ownership.
- `websiteId` enforces connected website ownership.
- `filename`, `mimeType`, and `altText` provide safe display metadata.
- `metadata.publicUrl`, `metadata.cdnUrl`, or `metadata.externalUrl` may be resolved into a public URL through the shared safe resolver.
- `metadata.width`, `metadata.height`, and `metadata.fileSize` may store safe numeric metadata.
- `deletedAt` represents archived lifecycle state.

Raw storage keys, provider internals, and raw metadata are never returned by the Platform API.

## Storage Strategy

Milestone 9 supports media registration only. Operators can register an externally hosted public file by URL when that URL passes the safe public URL rules.

Allowed public URLs:

- `https://...`
- `http://...`

Rejected public URLs:

- `javascript:`
- `data:`
- `file:`
- malformed URLs

Future providers such as local cPanel files, S3-compatible storage, Cloudflare R2, or Vercel Blob can attach behind the same media metadata boundary without changing connected website contracts.

## Dashboard Workflow

The dashboard Media screen lives at:

`/websites/[websiteId]/media`

Operators can:

- view active and archived media assets for the current website
- register an external public media asset
- edit filename and alt text
- archive media assets
- restore archived media assets

The screen is only available for Sharoz Connected websites with the Media module enabled.

## Blog Media Selection

The Blog post editor now uses an active same-website media selector for featured media. The UI only lists assets for the current website, but server-side Blog mutations also validate the selected media ID against organization, website, and active lifecycle scope.

Archived media cannot be newly selected as featured media.

## Platform API

Media endpoints:

- `GET /api/platform/v1/media`
- `GET /api/platform/v1/media/[id]`

Both endpoints authenticate with website API credentials, derive organization and website identity from the credential, require the Media module, and return only active assets for that website.

Safe response shape:

- `id`
- `filename`
- `url`
- `altText`
- `width`
- `height`
- `mimeType`
- `createdAt`

Unavailable, archived, cross-site, or cross-tenant assets return `NOT_FOUND` for single asset requests.

## SDK Usage

`@sharoz/sdk` exposes framework-neutral Media methods:

- `client.media.list(options?)`
- `client.media.getById(id)`

Credentials stay in the `Authorization` header. Query values and IDs are encoded, and responses are validated through `@sharoz/contracts`.

## Connected Media Slice

`apps/example-connected-blog` includes a `/media` route that calls the SDK server-side and displays image assets when a safe URL is available. It handles `MODULE_NOT_ENABLED` without exposing credentials to browser code.

## Security

Dashboard Media mutations validate:

- authenticated user session
- organization access
- website access
- Media module enablement
- media asset scope

Platform Media reads validate:

- credential authentication
- credential-derived organization and website
- Media module enablement
- active lifecycle scope

No client-supplied organization or website ID is trusted by Platform API media reads.

## Audit Events

Implemented audit events:

- `media_asset.created`
- `media_asset.updated`
- `media_asset.archived`
- `media_asset.restored`

Audit metadata includes only safe identifiers, MIME type, website ID, and lifecycle state.

## Known Limitations

- No binary upload provider is implemented.
- No physical file deletion is implemented.
- No folders, versions, transformations, compression, CDN invalidation, or AI metadata generation are implemented.
- Public media URLs must already be externally hosted and publicly accessible.

## Future Provider Boundary

A future storage provider can add upload, signed internal storage, transformations, or deletion behind the Media service. The Platform API should continue returning only safe public media metadata and must not expose provider secrets or raw storage internals.
