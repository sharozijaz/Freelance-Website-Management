# V2 Forms Platform

## Architecture

Forms are a Sharoz Connected website module. Connected websites use `@sharoz/sdk`, the SDK calls the Platform API, the Platform API validates credential-derived scope, and submissions are stored centrally in PostgreSQL.

Connected websites do not import dashboard code, Drizzle, Payload, Better Auth, or database schemas.

## Domain Model

The existing database model is reused:

- `forms` stores organization-scoped and website-scoped form definitions.
- `form_fields` stores ordered field definitions.
- `form_submissions` stores submitted data and source metadata.

Published forms are public. Draft, archived, deleted, cross-tenant, and cross-website forms are hidden from connected websites.

## Public Field Contract

Supported public field types:

- `text`
- `email`
- `tel`
- `textarea`
- `select`
- `checkbox`

The database currently stores phone fields as `phone`; the Platform API maps that to public `tel`.

Public form responses expose:

- `id`
- `name`
- `slug`
- `successMessage`
- safe fields with `id`, `name`, `label`, `type`, `required`, `placeholder`, and select `options`

Raw database rows, internal validation metadata, dashboard-only configuration, and secrets are not exposed.

## Validation Model

Connected website validation is treated as convenience only. The Platform API validates:

- credential authentication
- Forms module enablement
- organization and website scope from the credential
- published form lifecycle
- request body shape
- maximum request body size
- maximum submitted field count
- unknown fields
- required fields
- email structure
- select option membership
- checkbox boolean values
- bounded string values

Dynamic JavaScript validation and arbitrary expressions are not evaluated.

## Platform API

Endpoints:

- `GET /api/platform/v1/forms`
- `GET /api/platform/v1/forms/[slug]`
- `POST /api/platform/v1/forms/[slug]/submissions`

All endpoints use the existing Platform API authentication and response envelope. Organization and website identity are derived from the authenticated website credential, never from query parameters.

Submission acknowledgement returns only:

- `submissionId`
- `submittedAt`

## Environment Behavior

Website API credentials are environment-scoped. The current `form_submissions` table does not have a dedicated environment foreign key, so Milestone 10 stores environment origin in the existing `source` JSON:

- `environmentId`
- `environmentType`

This lets operators distinguish staging/test submissions from production submissions without a migration.

## Abuse Boundaries

Implemented:

- bounded JSON body size
- bounded field count
- bounded string values
- malformed JSON rejection
- unknown field rejection

Not implemented:

- distributed rate limiting
- CAPTCHA
- spam scoring
- third-party anti-abuse providers

Rate limiting remains a deployment concern until a production-safe shared rate-limit backend is selected.

## SDK Usage

`@sharoz/sdk` exposes:

- `client.forms.list(options?)`
- `client.forms.getBySlug(slug)`
- `client.forms.submit(slug, input)`

Credentials remain in the `Authorization` header. Slugs are URL encoded. Submission bodies are JSON POST payloads validated by `@sharoz/contracts`.

## Connected Forms

`apps/example-connected-blog` includes `/contact`.

The page fetches the public Contact form server-side, renders safe fields, and submits through a server action. The credentialed SDK is never instantiated in browser code and `SHAROZ_SECRET` is not exposed to the client.

## Dashboard Management

Existing dashboard Forms screens remain available, and Milestone 10 adds website-scoped paths:

- `/websites/[websiteId]/forms`
- `/websites/[websiteId]/forms/[formId]/submissions`

Submission values are rendered as text only on the protected submission detail screen.

## Demo Seed

The guarded connected demo seed still requires:

`SHAROZ_SEED_CONNECTED_DEMO=true`

When enabled, it now:

- enables the Forms module
- creates a published Contact form
- creates name, email, and message fields

The seed is idempotent and does not run during migrations.

## Connected E2E

`pnpm --filter @sharoz/example-connected-blog e2e:connected` now verifies Blog and Forms Platform API behavior when the required live environment variables are present.

It does not mock the Platform API.

## Security Boundaries

- Connected requests never provide trusted organization or website scope.
- Platform API derives scope from credentials.
- Form submission values are untrusted text.
- No `dangerouslySetInnerHTML` is used for submission rendering.
- No credentials are placed in browser storage or query strings.

## Known Limitations

- No drag-and-drop form builder.
- No conditional logic.
- No arbitrary JavaScript validation.
- No email automation.
- No CAPTCHA provider.
- No file uploads.
- No payment forms.
- No dedicated environment foreign key on submissions yet.
- No production-safe distributed rate limiter yet.
