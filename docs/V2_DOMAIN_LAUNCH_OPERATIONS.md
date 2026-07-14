# V2 Domain Launch Operations

This document describes the V2 domain, DNS, SSL, and website launch operations layer for the Sharoz Agency Website Management Platform.

## Architecture Findings

The platform already had a strong domain foundation:

- `domains` belongs to an organization, website, and website environment.
- `website_environments` separates staging and production runtime ownership.
- `websites.primaryDomain` stores the dashboard summary of the current production primary domain.
- `domains.isPrimary` stores the authoritative primary flag among production domains.
- `domains.dnsState`, `domains.sslState`, and `domains.verificationStatus` already model operational readiness.
- `domains.deletedAt` supports soft removal.
- `domains.domain` has a global unique index, so an active hostname cannot silently belong to multiple websites.

No duplicate domain model was introduced.

## Domain Ownership Model

Every domain belongs to:

- one organization
- one website
- one website environment

Domain reads and mutations validate:

- the authenticated dashboard user's organization permission
- the requested website when a website-scoped route is used
- the domain's website organization
- the domain environment's organization
- the domain environment's website

Browser-submitted organization IDs are ignored. Organization scope is derived from authenticated dashboard context and database-owned records.

## Domain Normalization

Domains are stored as hostnames only.

Accepted examples:

- `https://www.client-example.com/` -> `www.client-example.com`
- `http://client-example.com` -> `client-example.com`
- `www.client-example.com/` -> `www.client-example.com`
- `CLIENT-EXAMPLE.com.` -> `client-example.com`

Rejected examples:

- hostnames with credentials
- hostnames with ports
- query strings
- fragments
- localhost
- wildcard hostnames
- malformed labels

Internationalized domains are converted to their ASCII representation before storage.

The platform does not perform registrar-level validation.

## Domain Conflict Behavior

`domains.domain` is globally unique. A hostname cannot be actively assigned to multiple websites.

The platform does not silently reassign a domain. If a hostname already exists, the operator must remove or resolve the existing assignment first.

## Primary Production Domain Model

Only a domain assigned to the production environment can become the primary production domain.

When a primary production domain is selected:

- all other active domains in that production environment are cleared as primary
- the selected domain receives `isPrimary = true`
- `websites.primaryDomain` is synchronized to the selected hostname
- `websites.productionUrl` is synchronized to `https://<primary-domain>`
- a safe audit event is recorded

`domains.isPrimary` is the operational source of truth. `websites.primaryDomain` remains a summary/cache field for dashboard scanning and URL helpers.

## DNS Operational Model

DNS status is manually tracked using the existing `dnsState` enum:

- `unknown`
- `pending`
- `valid`
- `invalid`

This milestone does not implement fake DNS automation. Operators should mark DNS as valid only after real operational verification.

The platform may later add server-side DNS resolution checks using bounded Node DNS APIs. Generic DNS resolution should be reported as resolution status, not target verification, unless expected target data is available.

## SSL Operational Model

SSL status is manually tracked using the existing `sslState` enum:

- `not_requested`
- `pending`
- `issued`
- `failed`

This milestone does not claim SSL is valid based on an HTTPS URL string. Operators should mark SSL as issued only after real certificate verification.

Future server-side certificate inspection may record expiry and validity, but it must not disable TLS verification globally or expose certificate internals in audit metadata.

## Launch Readiness Architecture

Launch readiness is computed server-side from database state. Browser-submitted checklist values are not trusted.

Readiness checks return:

- `key`
- `label`
- `status`
- `message`

Statuses are:

- `pass`
- `warning`
- `blocker`

Current checks include:

- production environment exists
- production domain exists
- primary production domain configured
- latest production deployment exists and is ready
- production URL matches primary domain
- DNS is marked valid
- SSL is marked issued
- active production credential exists for Sharoz Connected websites
- enabled module state has no obvious platform-level blocker

The service does not invent checks that cannot be evaluated reliably.

## Blocker, Warning, And Pass Rules

Blockers prevent launch recording. Examples:

- no production environment
- no production domain
- no primary production domain
- latest production deployment is not ready
- DNS is not marked valid
- SSL is not marked issued
- missing production API credential for a Sharoz Connected website

Warnings require operator acknowledgement. Examples:

- production URL summary does not match the primary domain
- no business modules are enabled for a simple website

Passed checks are informational and require no action.

## Launch Recording Behavior

A launch is an operational record that the website was intentionally activated for production.

Before recording launch, the platform recomputes readiness server-side:

- blockers reject launch
- warnings require explicit operator acknowledgement

When launch succeeds:

- `websites.launchedAt` is set if it was empty
- `websites.status` is set to `active`
- production URL is synchronized with the primary production domain when available
- `website.launch_recorded` is written to the audit log

The launch operation does not mutate deployment history.

## launchedAt Behavior

`websites.launchedAt` is the original launch timestamp.

Future successful deployments are deployments, not new launches. They do not overwrite `launchedAt`.

If a website has already launched, the launch page shows the original launch date along with current production readiness and latest production deployment state.

## Staging-To-Production Workflow

The intended agency workflow is:

1. Prepare the staging website.
2. Review content.
3. Configure staging access if required.
4. Prepare the production environment.
5. Assign the production domain.
6. Select the primary production domain.
7. Record the production deployment.
8. Configure DNS.
9. Confirm SSL.
10. Review launch readiness.
11. Record website launch.
12. Perform post-launch checks.

The platform does not automatically copy staging content, promote staging deployments, or mutate production state unless that architecture is explicitly added later.

## Post-Launch Checklist

Operators should manually verify:

- homepage is reachable
- primary domain redirects correctly
- HTTPS works
- navigation works
- forms submit
- connected Platform API access works
- robots configuration is reviewed
- sitemap is reviewed
- analytics is reviewed if configured
- staging indexing protection is reviewed

These are operational checklist items, not automatically completed checks.

## Audit Events

Safe audit events include:

- `domain.created`
- `domain.removed`
- `domain.primary_changed`
- `domain.dns_status_updated`
- `domain.ssl_status_updated`
- `website.launch_recorded`

Audit metadata may contain:

- domain ID
- environment ID
- hostname
- safe status values
- website ID

Audit metadata must not contain:

- credentials
- API secrets
- environment variables
- database URLs
- authorization headers
- raw certificate data
- provider secrets

## Security Boundaries

The dashboard owns domain and launch operations.

Connected public websites remain independent and must communicate through Platform APIs and `@sharoz/sdk` only. Public websites must not import dashboard internals, database packages, Better Auth, Payload, or dashboard UI components.

DNS and SSL status changes are server-side dashboard operations. They are never performed from browser-only code.

## Schema Changes

This milestone adds one nullable column:

- `websites.launched_at timestamp with time zone`

No historical migrations were rewritten.

## Migration Details

Generated migration:

- `packages/database/drizzle/0010_third_captain_marvel.sql`

The SQL is additive:

```sql
ALTER TABLE "websites" ADD COLUMN "launched_at" timestamp with time zone;
```

There are no enum casts, backfills, not-null constraints, or new foreign keys in this migration.

## Known Limitations

- DNS status is manually tracked.
- SSL status is manually tracked.
- The launch checklist does not automatically test homepage reachability, forms, analytics, robots, or sitemap state.
- Launch recording is an operational timestamp, not deployment automation.
- Domain registrar integrations are future work.
