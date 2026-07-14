# V2 Connected Website Operational Hardening

This document records the operational hardening added after the Blog Platform API and connected Blog example.

## Architecture Audit

The Platform API remains owned by `apps/dashboard/app/api/platform/v1`, with shared authorization and module checks in `apps/dashboard/lib/platform-api`.

The framework-neutral SDK remains in `packages/sdk`. Connected websites call the Platform API through the SDK and must not import dashboard internals, Drizzle, Payload, Better Auth, or `@agency/ui`.

Tenant and environment identity continue to come only from the authenticated website API credential. Request query parameters, route params, or client-supplied IDs must not replace the credential-derived organization, website, or environment.

## Preview Authorization

Website API credentials and human preview authorization are separate concerns.

The connected website receives a server-side preview access secret or hash for the staging environment. A human preview link calls the connected site `/preview?token=...&redirect=/blog/post`, where the token is validated server-side and exchanged for an HttpOnly `sharoz_preview` cookie.

The connected site only sends `preview: true` to the SDK when the HttpOnly preview cookie is valid. `?preview=true` on a page URL does not grant draft access.

Rotating the staging preview access token changes the stored hash and invalidates old preview cookies.

## Staging Access Protection

Staging access protection is separate from draft preview.

When `SHAROZ_STAGING_ACCESS_ENABLED=true`, connected site middleware blocks normal page access until a valid staging access token has been exchanged for the HttpOnly `sharoz_staging_access` cookie.

This protects the staging site even when the visitor is only viewing published content. Draft visibility still requires the separate preview cookie.

## Media Public URL Strategy

The Platform API does not expose raw media metadata. It resolves a safe public URL through `apps/dashboard/lib/platform-api/media.ts`.

The resolver currently supports `publicUrl`, `cdnUrl`, and `externalUrl` metadata keys and only returns `http` or `https` URLs. Storage provider details, private keys, and internal metadata are not returned in API responses.

Future storage providers should plug into this resolver rather than adding provider-specific logic to Blog serializers.

## Blog Filtering

Blog category and tag filters are applied at database-query level using scoped `exists` predicates for the current organization and website.

The service keeps defensive in-memory checks after fetching, but the database receives the taxonomy constraints so unrelated tenant or website rows are not fetched first.

## Demo Seed

Run the connected demo seed only when intentionally preparing local/demo data:

```bash
SHAROZ_SEED_CONNECTED_DEMO=true pnpm --filter @agency/database db:seed:connected-demo
```

The seed is repeatable. It creates or updates:

- `Sharoz Connected Demo` organization
- `Connected Blog Demo` website
- staging and production website environments
- enabled Blog module
- one published Blog post
- category and tag relationships
- one staging API credential if no credential exists

The script refuses to run unless `SHAROZ_SEED_CONNECTED_DEMO=true` is set.

## Connected Verification

Run the connected verification script from the example app when the dashboard API and connected site are available:

```bash
pnpm --filter @sharoz/example-connected-blog e2e:connected
```

Required environment variables:

- `SHAROZ_API_BASE_URL`
- `SHAROZ_PUBLIC_KEY`
- `SHAROZ_SECRET`

Optional environment variables:

- `CONNECTED_E2E_SITE_URL`
- `SHAROZ_PREVIEW_ACCESS_TOKEN`
- `SHAROZ_STAGING_ACCESS_SECRET`

The script verifies Platform API Blog reads and, when a connected site URL is provided, checks the Blog route and cookie-based preview/staging access routes.

## cPanel Deployment Readiness

The example connected Blog app uses Next.js standalone output.

For cPanel Node.js hosting, deploy the standalone build with server-side environment variables configured outside browser-exposed settings:

- `SHAROZ_API_BASE_URL`
- `SHAROZ_PUBLIC_KEY`
- `SHAROZ_SECRET`
- `SHAROZ_PREVIEW_ACCESS_TOKEN_HASH` or `SHAROZ_PREVIEW_ACCESS_TOKEN`
- `SHAROZ_STAGING_ACCESS_ENABLED`
- `SHAROZ_STAGING_ACCESS_SECRET_HASH` or `SHAROZ_STAGING_ACCESS_SECRET`

Never configure website API credentials as `NEXT_PUBLIC_*` variables.
