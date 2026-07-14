# V2 Platform API And SDK

Sharoz Platform V2 exposes connected website data through a versioned Platform API and a server-side SDK.

## Platform API Boundary

The initial Platform API lives in `apps/dashboard` under:

```text
/api/platform/v1
```

This is intentionally separate from dashboard browser APIs, Better Auth APIs, Payload APIs, and V1 CMS/web renderer routes.

The current repository does not need a separately deployed API app yet. Keeping the first boundary inside `apps/dashboard` preserves deployment simplicity while the internal `lib/platform-api` folder keeps the code extraction-ready.

## API Versioning

All connected-website routes start with `/api/platform/v1`.

Future breaking changes should use a new version namespace instead of changing V1 behavior in place.

## Credential Transport

Website servers authenticate with the `Authorization` header:

```text
Authorization: Bearer <public_key>.<secret>
```

Example:

```text
Authorization: Bearer spk_xxxxx.sps_xxxxx
```

Credentials must never be sent in URLs, query strings, cookies, local storage, session storage, or browser JavaScript.

## Website Principal

Successful credential authentication creates a trusted website principal:

- `organizationId`
- `websiteId`
- `environmentId`
- `environmentType`
- `credentialId`
- `credentialLabel`

This identity is derived only from the stored website credential. Platform API routes must not trust `organizationId`, `websiteId`, or `environment` supplied by request query parameters, headers, or request bodies.

## Request Context

`PlatformRequestContext` is the trusted server-side request context for future module services.

Future module services should accept this context instead of accepting tenant identity from public website requests.

## Module Authorization

Platform API authorization is:

```text
Authenticated Website Principal
+
Enabled Website Module
```

Dashboard authorization remains separate:

```text
Better Auth Session
+
Membership
+
Capability Permission
```

The reusable guard is:

```text
requireEnabledModule(context, "blog")
```

It verifies that the module key is known, enabled for the authenticated organization and website, and still belongs to a Sharoz Connected website.

## Error Contract

Errors use a stable JSON shape:

```json
{
  "error": {
    "code": "MODULE_NOT_ENABLED",
    "message": "The requested module is not available."
  }
}
```

Supported codes:

- `UNAUTHORIZED`
- `INVALID_REQUEST`
- `MODULE_NOT_ENABLED`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

Responses must not expose stack traces, SQL details, file paths, secret verification causes, or internal database errors.

## Response Contract

Successful Platform API responses use a minimal data envelope:

```json
{
  "data": {}
}
```

This keeps SDK parsing consistent without introducing GraphQL, tRPC, or a complex envelope framework.

## Foundation Endpoint

`GET /api/platform/v1/context`

Requires website credential authentication.

Returns safe context:

- website id, name, type
- organization id, name
- credential id, label
- enabled module keys

It never returns plaintext secrets or secret hashes.

## Blog Endpoints

Milestone 6 adds the first business module read API:

- `GET /api/platform/v1/blog/posts`
- `GET /api/platform/v1/blog/posts/[slug]`
- `GET /api/platform/v1/blog/categories`
- `GET /api/platform/v1/blog/tags`

Blog reads require website credential authentication and the `blog` module.

Production credentials receive published content only.

Staging credentials receive published content by default and may request draft visibility with `preview=true`.

`preview=true` is not authorization. The authenticated credential environment decides whether preview can widen visibility.

## Shared Contract Types

Transport contract types live in `@sharoz/contracts`.

This prevents the SDK from importing dashboard route code, database row types, Payload types, or internal service types.

## SDK Architecture

The first SDK package is `@sharoz/sdk`.

It is a framework-neutral HTTP client. It does not depend on Next.js, React, Payload, Better Auth, dashboard code, Drizzle, database code, or `@agency/ui`.

## SDK Configuration

Example:

```ts
import { createSharozClient } from "@sharoz/sdk";

const sharoz = createSharozClient({
  baseUrl: process.env.SHAROZ_PLATFORM_URL!,
  publicKey: process.env.SHAROZ_PUBLIC_KEY!,
  secret: process.env.SHAROZ_SECRET!,
});

const context = await sharoz.context.get();
```

`SHAROZ_PUBLIC_KEY` and `SHAROZ_SECRET` are server environment variables.

They must not use `NEXT_PUBLIC_` prefixes.

The core SDK does not read environment variables automatically. Applications pass configuration explicitly.

## SDK Blog Client

`@sharoz/sdk` exposes explicit Blog methods:

```ts
const posts = await sharoz.blog.posts.list({
  page: 1,
  limit: 10,
  category: "news",
  tag: "release",
});

const post = await sharoz.blog.posts.getBySlug("hello-world", {
  preview: true,
});

const categories = await sharoz.blog.categories.list();
const tags = await sharoz.blog.tags.list();
```

The SDK does not accept `organizationId`, `websiteId`, or `environment` Blog options because those identities come from the credential.

## Server-Only Rules

Website credentials are server secrets.

The SDK does not provide browser credential storage, local storage helpers, sessions, cookies, or public token handling.

A hard runtime server-only marker was not added because the SDK is intentionally framework-neutral and should work in Node.js, serverless, Workers-like runtimes, and test environments. The enforceable rule is architectural: never import a configured credential-bearing client into browser bundles.

## SDK HTTP Client

The internal SDK HTTP client supports:

- `GET`
- `POST`
- `PATCH`
- `DELETE`
- JSON request bodies
- JSON response parsing
- Authorization header construction
- custom `fetch` injection
- typed Platform API error parsing
- base URL normalization

Retries, caching, and revalidation are intentionally not implemented yet.

## SDK Error Handling

SDK errors use `SharozApiError`.

It exposes safe fields:

- `code`
- `message`
- `status`

Example:

```ts
try {
  await sharoz.context.get();
} catch (error) {
  if (error instanceof SharozApiError) {
    console.error(error.code);
  }
}
```

## Future Module Namespaces

The SDK should grow through explicit module namespaces:

```text
client.blog.posts.list()
client.catalog.products.list()
client.orders.create()
```

Do not add generic collection APIs such as `client.collection("posts")`.

## Security Rules

- Do not use Better Auth for website credential authentication.
- Do not expose website secrets in browser JavaScript.
- Do not send credentials in URLs.
- Do not log plaintext credentials.
- Do not trust request-supplied tenant IDs.
- Do not return secret hashes through Platform API responses.
- Do not let websites query the platform database directly.
- Do not use Payload as the Platform API.

## Known Limitations

- The foundation context endpoint and Blog read endpoints exist.
- Catalog, Orders, Booking, and other business module endpoints are not implemented yet.
- No live PostgreSQL E2E test is included in this milestone.
- Rate limiting hooks are still future work.
- SDK runtime server-only enforcement is documented rather than framework-enforced.

Next milestone:

**Post-Milestone 6 — Connected website operational hardening**
