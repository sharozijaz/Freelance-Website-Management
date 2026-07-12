# Deployment, Domains, and Hosting

Milestone 16 adds the deployment foundation for the Agency Website Platform. The goal is provider flexibility without coupling the dashboard, CMS, or website renderer to one hosting vendor.

## Provider Model

Hosting providers are represented by normalized adapters in `apps/dashboard/lib/deployment`.

- `manual` supports external hosting that the agency manages outside the platform.
- `vercel` is prepared for real API-backed integration when `VERCEL_API_TOKEN` is configured.
- `netlify` and `cloudflare` are registered as future providers but expose no fake capabilities.

Each provider declares its capabilities, required configuration, credential expectations, and adapter functions. Dashboard workflows check those capabilities before exposing provider-specific behavior.

## Manual / External Hosting

Manual hosting is a first-class provider. It lets the agency record:

- external hosting provider name
- deployment method
- provider dashboard URL
- production URL
- manual deployment history
- connected domains
- primary domain
- DNS instructions

This supports agencies that deploy through cPanel, FTP, managed WordPress hosts, static hosts, or any provider without an API integration.

## Database Tables

`hosting_provider_connections` stores one provider connection per website and provider. It belongs to an organization and website, and contains provider IDs, dashboard URLs, production URLs, configuration, and credential references.

`deployments` stores normalized deployment events across providers. It tracks provider, environment, status, deployment URL, trigger actor, timestamps, and provider metadata.

`domains` now stores provider connection references, provider domain IDs, required DNS records, and last checked time in addition to verification, DNS, SSL, and primary-domain state.

## Dashboard Modules

- `/deployments` lists normalized deployment history.
- `/deployments/[deploymentId]` shows deployment status and provider context.
- `/domains` lists connected domains across accessible tenants.
- `/domains/[domainId]` shows DNS instructions and primary-domain controls.
- `/websites/[websiteId]/hosting` manages hosting connections, manual deployments, domains, and production routing.

All routes use organization-aware permissions:

- `deployments:read`
- `deployments:trigger`
- `hosting:manage`
- `domains:read`
- `domains:manage`
- `provider_credentials:manage`

## Tenant Isolation

Every hosting connection, deployment, and domain belongs to an organization and website. Dashboard queries scope by the active organization or the authenticated user’s accessible organizations. The web app can resolve tenants by hostname through connected domain records.

## SEO and Routing

Primary domains update the website record’s `primaryDomain` and `productionUrl`. Shared SEO utilities resolve canonical base URLs in this order:

1. primary domain
2. production URL
3. configured fallback URL

This keeps canonical URLs aligned with domain routing.

## Webhooks

`/api/webhooks/vercel` provides a secure signature-verified webhook foundation. It does not fabricate provider events. Deployment synchronization can be added behind this route once real provider payload handling is connected.

## Future Providers

New providers should be added by:

1. implementing a provider adapter
2. registering capabilities in the provider registry
3. adding provider configuration validation
4. storing credentials through a secure credential reference
5. writing provider-specific tests

Dashboard pages should continue to consume normalized deployment/domain services rather than provider APIs directly.
