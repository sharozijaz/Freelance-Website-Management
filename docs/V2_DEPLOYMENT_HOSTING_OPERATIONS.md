# V2 Deployment & Hosting Operations

This document describes the V2 deployment and hosting operations layer for the Sharoz Agency Website Management Platform. It records the current architecture, the manual deployment workflow, and the boundary for future hosting provider integrations.

## Architecture Findings

The platform already had the core deployment foundation before this milestone:

- `deployments` records operational deployment history.
- `website_environments` owns staging and production environments for each website.
- `hosting_provider_connections` stores hosting/provider metadata.
- `domains` are scoped to websites, organizations, and website environments.
- `websites.deploymentStatus` stores a dashboard summary of the latest known deployment state.
- Audit logs already exist and are organization scoped.

The existing model is environment-aware and tenant-aware. Deployments are scoped by `organizationId`, `websiteId`, and `websiteEnvironmentId`, and the database preserves composite foreign-key protections so a deployment cannot point to an environment outside its website and organization.

## Deployment Lifecycle

The preferred V2 lifecycle is represented with the existing deployment status enum:

| Product lifecycle | Stored status |
| ----------------- | ------------- |
| queued            | `queued`      |
| in progress       | `deploying`   |
| succeeded         | `ready`       |
| failed            | `failed`      |
| cancelled         | `cancelled`   |

The platform reuses the existing enum instead of adding a duplicate lifecycle model.

Valid transitions are:

- `queued` -> `deploying`
- `queued` -> `cancelled`
- `deploying` -> `ready`
- `deploying` -> `failed`
- `deploying` -> `cancelled`

Terminal states are:

- `ready`
- `failed`
- `cancelled`

Terminal deployments cannot be moved back into progress.

## Deployment Ownership Model

Every deployment belongs to:

- one organization
- one website
- one website environment

Dashboard reads and mutations validate the authenticated dashboard user's permissions against the deployment organization. Website-scoped routes also validate that the deployment belongs to the requested website. Environment ownership is checked before deployment creation and status mutation.

Browser-provided organization IDs are not trusted. The organization is derived from the authenticated dashboard request and database-owned records.

## Trigger And Source Model

No new deployment table columns were required. Trigger/source metadata is stored as a safe projection in `deployments.metadata`.

Supported trigger values are:

- `manual`
- `platform`
- `provider`
- `webhook`

This milestone writes `manual` deployments only. Future provider or webhook integrations may write `provider` or `webhook` after a real integration exists.

Safe source metadata may include:

- trigger type
- source reference
- commit SHA

Deployment metadata must not contain credentials, provider tokens, authorization headers, environment variables, or raw provider responses.

## Manual Deployment Workflow

The dashboard supports manual deployment recording for websites and environments.

An operator can:

- choose the website environment
- choose whether the deployment is queued, in progress, completed successfully, or failed
- optionally record a deployment URL
- optionally record a source reference
- optionally record a commit SHA
- optionally record notes
- optionally record a safe failure reason when failed

Manual deployments are honest operational records. The platform does not pretend to deploy code automatically when no provider integration exists.

## Deployment Status Operations

Website-scoped deployment detail pages support controlled lifecycle operations:

- mark in progress
- mark succeeded
- mark failed
- cancel deployment

Each operation validates:

- authenticated dashboard user
- organization permission
- website scope
- deployment scope
- environment ownership
- valid state transition

When a deployment reaches a terminal state, `completedAt` is set. When a deployment moves to `deploying`, `startedAt` is set if it was not already present.

## Failure Information

The existing `failureSummary` field is reused for operator-safe failure information.

Before storage, failure text is normalized and redacted for common sensitive values such as:

- database URLs
- authorization bearer values
- token-like key/value pairs
- secret-like key/value pairs
- API key-like key/value pairs

Failure information should remain short, human-readable, and safe to show in the dashboard.

## Hosting Model

Hosting metadata remains in `hosting_provider_connections`.

The model supports operational awareness for:

- manual hosting
- cPanel or custom Node hosting
- Vercel
- Netlify
- Cloudflare
- future providers

The current milestone does not add fake provider automation. Provider credentials must remain outside deployment metadata. If provider credentials are introduced later, they should be stored through secure secret management and referenced by safe identifiers only.

## cPanel Readiness

Connected websites are deployed independently from the dashboard and platform internals. A cPanel deployment should use the connected website application and the public Platform APIs.

Recommended setup:

1. Build the connected website with a production Next.js standalone output.
2. Upload the standalone server output, static assets, and required package assets to the cPanel Node application.
3. Configure the cPanel Node application entry point to the standalone server entry produced by the build.
4. Set the production environment variables in cPanel.
5. Restart the cPanel Node application after every environment variable change.

Required runtime environment should include placeholders such as:

- `NEXT_PUBLIC_PLATFORM_API_BASE_URL=https://platform.example.com`
- `SHAROZ_WEBSITE_ID=<website-id>`
- `SHAROZ_WEBSITE_ENVIRONMENT=<production-or-staging>`
- `SHAROZ_API_KEY=<environment-scoped-api-key>`
- `SHAROZ_API_SECRET=<environment-scoped-api-secret>`

Production and staging should use different website environments and different credentials.

Example domain expectations:

- production: `https://www.client-example.com`
- staging: `https://staging.client-example.com`
- platform API: `https://platform.example.com`

Preview and staging protection should be configured through the platform's existing environment security controls. Credentials must never be committed to the connected website repository.

## Provider Abstraction Decision

The existing provider registry already defines provider boundaries. This milestone keeps the abstraction minimal:

- manual hosting records operational state only
- real providers may later implement create deployment, read status, and cancel deployment operations
- no fake provider success responses are introduced

Future provider integrations should write deployment records through the same scoped deployment service and audit path.

## Audit Events

The deployment service writes safe audit events:

- `deployment.created`
- `deployment.started`
- `deployment.succeeded`
- `deployment.failed`
- `deployment.cancelled`

Audit metadata is limited to:

- deployment ID
- website environment ID
- deployment status
- trigger type

Audit metadata must not include credentials, tokens, environment variables, authorization headers, database URLs, or raw provider responses.

## Website Overview Status

`websites.deploymentStatus` remains as a summary field for dashboard scanning. The source of truth is deployment history, while the website field is updated when manual deployments are created or lifecycle operations change status.

This avoids a risky schema removal while keeping the dashboard status understandable. A future milestone may derive richer per-environment status directly from the latest environment-scoped deployment records.

## Security Boundaries

Deployment operations preserve these boundaries:

- deployment queries are organization scoped
- website-scoped pages validate the deployment's website
- environment ownership is validated for create and mutate operations
- deployment detail reads cannot cross tenant boundaries
- deployment mutations cannot cross tenant boundaries
- organization IDs are not accepted from browser form data
- deployment metadata is projected before display
- raw deployment metadata is not dumped into the UI
- provider credentials are not stored in deployment metadata

Public connected websites remain independent. They must not import dashboard internals, the database package, Better Auth, Payload, dashboard UI components, or internal services.

## Schema And Migration Details

No schema changes were required for this milestone.

The existing schema already provided:

- deployment status enum
- environment-scoped deployments
- failure summary
- notes
- metadata
- hosting provider connections
- domain/environment relationships
- audit logs

`db:generate` reported no schema changes.

## Known Limitations

- Manual deployments are records only; they do not deploy code.
- Provider automation is not implemented in this milestone.
- Deployment status is summarized on `websites.deploymentStatus`; richer per-environment overview cards are future work.
- Failure redaction is defensive but should not be treated as permission to paste secrets into failure messages.
- cPanel deployment instructions are operational guidance; exact hosting controls vary by provider.

## Future Provider Integration Boundary

A future real provider integration should:

- authenticate to the provider server-side only
- create deployment records before triggering provider operations
- update deployment records from provider status or webhook events
- scope provider callbacks to organization, website, and environment
- store only safe provider identifiers in deployment metadata
- write audit events through the existing audit service
- keep public connected websites communicating only through `@sharoz/sdk` and Platform APIs
