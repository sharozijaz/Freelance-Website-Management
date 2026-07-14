# V2 Website Environments

Sharoz Platform is a centralized web application for agency operations and modular website services.
It is not a desktop application, and it does not require public client websites to be hosted by Sharoz.

Custom public websites may run on Sharoz-managed hosting, Vercel, a VPS, cPanel with Node.js support,
or another Node.js-compatible host. Those websites remain independently deployed applications.

## Why Environments Exist

Sharoz's agency workflow needs a review boundary before production:

```text
Client
-> Figma design
-> approved design
-> custom Next.js website development
-> staging deployment
-> client review
-> revisions
-> approval
-> production deployment
-> maintenance / care plan
```

V2 now models that boundary explicitly:

```text
Organization
-> Website
-> Website Environment
```

Initial environment types:

- `staging`
- `production`

Environment status is intentionally minimal:

- `active`
- `inactive`

Deployment lifecycle remains on deployment records, not on environments.

## Platform Architecture

```text
Sharoz Platform Web App
        |
        +-- Dashboard
        +-- Platform API
        +-- PostgreSQL

Custom Website - Staging
        |
        | staging credential
        v
@sharoz/sdk
        v
Platform API
        v
Staging Website Principal

Custom Website - Production
        |
        | production credential
        v
@sharoz/sdk
        v
Platform API
        v
Production Website Principal
```

## Data Model

`website_environments` stores:

- `id`
- `organization_id`
- `website_id`
- `type`
- `name`
- `status`
- `base_url`
- timestamps

Rules:

- Every environment belongs to exactly one website.
- Every environment belongs to the same organization as the website.
- A website can have only one environment of each type.
- Composite foreign keys enforce tenant and website consistency for environment-owned records.

## Creation Behavior

Sharoz Connected websites receive both `staging` and `production` environments.

The safest behavior is mixed:

- New Sharoz Connected websites are initialized during website creation.
- Websites converted to Sharoz Connected are initialized during the type-change workflow.
- Existing Sharoz Connected websites are also initialized idempotently when environments are listed.

This prevents duplicates and supports older records before the migration.

WordPress and External / Legacy websites may use environments for operational tracking, especially production domains and deployment history, but they do not receive Sharoz Connected credential/content behavior.

## Credential Ownership

Website API credentials are environment-scoped.

A credential identifies:

- organization
- website
- environment
- credential

The authenticated website principal is fully server-derived:

- `organizationId`
- `websiteId`
- `environmentId`
- `environmentType`
- `credentialId`
- `credentialLabel`

The Platform API never trusts query parameters, request headers, request bodies, or SDK config to choose the trusted environment identity.

Existing credentials are backfilled to the staging environment. This is conservative because existing development credentials are safer as preview/staging credentials than production credentials.

## Platform Request Context

`PlatformRequestContext` includes trusted environment identity.

`GET /api/platform/v1/context` returns safe environment metadata:

- environment id
- type
- name
- base URL

It never returns credential secrets, credential hashes, database internals, or Authorization headers.

## Domains

Domains are environment-owned through `website_environment_id`.

Policy:

- staging domains belong to the staging environment.
- production domains belong to the production environment.
- existing domains are backfilled to production.
- only production domains can be marked as the website primary domain.

This milestone does not implement DNS automation or SSL provisioning.

## Deployments

Deployments are environment-owned through `website_environment_id`.

Policy:

- production deployments target production.
- staging, preview, and development deployment history targets staging when available.
- historical deployment records are preserved.

This milestone does not implement deployment execution automation, GitHub Actions, cPanel deployment automation, or Vercel API automation.

## Hosting Connections

`hosting_provider_connections` remain website-scoped.

Reason:

- one Vercel account/project connection may represent reusable hosting infrastructure.
- one cPanel or VPS account may host multiple runtime targets.
- environment ownership belongs on the operational artifacts that target a runtime: credentials, domains, and deployments.

## Module Authorization

Module enablement remains website-scoped.

Expected flow:

```text
Website Principal
-> trusted Website identity
-> trusted Environment identity
-> Website Module authorization
-> environment-specific data visibility
```

No `environment_modules` table exists in this milestone.

## Blog Visibility

Blog Platform API reads use the authenticated environment identity.

Production credentials:

- return published content only.
- never return drafts.
- never return archived posts.

Staging credentials:

- receive published content by default.
- may access draft content only when `preview=true` is explicitly requested.
- always exclude archived content.
- always exclude soft-deleted content.

`?preview=true` can only affect filtering after the authenticated principal is already authorized as staging.

Production credentials ignore preview widening and continue to receive published content only.

Do not trust:

- `?environment=staging`
- `X-Environment: staging`
- environment values in request bodies

## Dashboard Workflow

Website detail includes an Environments entry.

The environment screen shows:

- staging
- production
- name
- status
- base URL
- last deployment summary

Authorized users can update:

- environment name
- base URL
- status

Environment management uses the existing `websites:manage` capability.

Developer credential creation requires selecting an environment. Credential rotation preserves the original credential's environment. Credential reassignment is not allowed; create a new credential for another environment.

Credential management remains controlled by `developer:credentials`.
Domain management remains controlled by `domains:manage`.
Deployment access follows existing deployment permissions.

## Audit Events

Events:

- `website_environment.updated`
- `website_credential.created`
- `website_credential.rotated`
- `website_credential.revoked`

Credential audit metadata may include environment id and type.

Never log:

- plaintext credentials
- credential secret hashes
- Authorization headers

## Migration And Backfill

The migration is additive and staged:

1. Create environment enums.
2. Create `website_environments`.
3. Create production environments for existing websites.
4. Create staging environments for Sharoz Connected websites and websites with existing credentials or non-production deployment records.
5. Add nullable environment foreign keys to credentials, domains, and deployments.
6. Backfill existing credentials to staging.
7. Backfill existing domains to production.
8. Backfill existing deployments by deployment environment, falling back to production when staging is unavailable.
9. Set environment foreign keys to `NOT NULL`.
10. Add foreign keys and indexes.

No tables are dropped. No records are deleted. No credentials are exposed.

## Tenant Isolation

Environment-owned tables use composite foreign keys to ensure the environment belongs to the same organization and website as the credential, domain, or deployment record.

Service functions validate:

- organization scope
- website scope
- environment scope
- dashboard capability permissions

## Known Limitations

- Blog Platform API read endpoints exist for posts, post-by-slug, categories, and tags.
- SDK Blog client methods exist under `client.blog`.
- A minimal connected website vertical slice exists in `apps/example-connected-blog`.
- No deployment automation exists.
- No DNS automation exists.
- No SSL automation exists.
- No per-environment module enablement exists.
- Environment base URLs are informational in this milestone.

## Non-Goals

This milestone does not:

- create duplicate CMS databases for staging.
- duplicate Blog posts between staging and production.
- create a desktop application.
- make client hosting dependent on Sharoz hosting.

Next milestone:

**Post-Milestone 6 - Connected website operational hardening**
