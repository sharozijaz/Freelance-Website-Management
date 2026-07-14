# V2 Module Foundation

Sharoz Platform V2 introduces two foundation concepts:

1. Website type.
2. Website module enablement.

These concepts classify how a website integrates with the platform and which first-party business capabilities are available for that website.

## Website Types

### WordPress

Existing WordPress client websites.

Initial responsibility:

- Hosting records.
- Domains.
- SSL.
- Maintenance.
- Backups.
- Website health.
- Care plans.

WordPress websites do not use V2 business modules in this milestone.

### Sharoz Connected

Custom websites built by Sharoz.Dev.

Preferred stack:

- Next.js.
- TypeScript.
- Tailwind CSS.
- pnpm.
- Zod.
- Future `@sharoz/sdk`.

Sharoz Connected websites may use enabled platform modules. Their public presentation remains inside the website codebase.

### External / Legacy

Static HTML websites, PHP websites, website builders, unsupported platforms, or externally managed websites.

The platform tracks operational information without pretending deep application integration exists.

Existing websites are safely classified as `external_legacy` by the additive migration. This avoids accidentally treating V1 sites as Sharoz Connected websites.

## Module Keys

Initial first-party module keys:

- `blog`
- `forms`
- `media`
- `seo`
- `catalog`
- `orders`
- `customers`
- `booking`

These keys are explicit and code-owned. They are not loaded dynamically and are not stored as marketplace/plugin definitions in the database.

## Module Registry

The first-party registry lives in `packages/lib/src/modules.ts`.

It exposes:

- `listModuleDefinitions()`
- `getModuleDefinition(key)`
- `isKnownModuleKey(value)`
- `getModuleDependencies(key)`
- `getDependentModuleKeys(key)`

Each module definition includes:

- key
- label
- description

The registry exists so dashboard services and future Platform API/SDK contracts share the same module vocabulary.

## Website Module Enablement Model

Module enablement is stored in `website_modules`.

Fields:

- `id`
- `organization_id`
- `website_id`
- `module_key`
- `enabled`
- `created_at`
- `updated_at`

Rules:

- Every record is organization-scoped.
- Every record is website-scoped.
- A unique index prevents duplicate records for the same website and module key.
- Disabled records may remain for audit/configuration visibility.
- Modules are not stored as a JSON array on `websites`.

## Dependency Rules

Initial dependency rules:

- `orders` requires `catalog`.
- `orders` requires `customers`.
- `blog` does not automatically require `media`.
- `booking` does not automatically require `customers` yet.

Chosen behavior: dependencies must already be enabled before enabling `orders`.

Disabling `catalog` or `customers` is rejected while `orders` is enabled. The service does not silently break dependencies.

## Permission Behavior

Read operations require `modules:read`.

Mutation operations require `modules:manage`.

The service uses capability checks through the existing dashboard permission system. It does not compare role names directly.

## Tenant Isolation

Every module operation resolves the target website first, then checks permissions against the website's organization.

The service rejects:

- Unknown module keys.
- Cross-tenant reads.
- Cross-tenant mutations.
- Module enablement for unsupported website types.

## Dashboard Behavior

The dashboard now shows website type in website inventory and website detail screens.

Website create and type-edit flows support:

- WordPress
- Sharoz Connected
- External / Legacy

A website-local Modules area shows all known first-party modules with enabled/disabled state. Authorized users can enable or disable modules for Sharoz Connected websites.

WordPress and External / Legacy websites display the registry but cannot enable business modules in this milestone. This restriction is enforced server-side.

## Presentation Boundary

Modules provide data and business capabilities to connected websites.

Modules do not control frontend layout or public presentation. Custom public websites own their React components, routes, styles, section composition, and user experience. Future websites should consume module data through the Platform API and `@sharoz/sdk`, not through Payload page blocks or the V1 `apps/web` renderer.

## Known Limitations

- Blog, Catalog, Orders, Customers, and Booking domain models are not implemented yet.
- Platform API is not implemented yet.
- `@sharoz/sdk` is not implemented yet.
- Website API credentials are not implemented yet.
- WordPress-specific integration modules are not implemented yet.
- Payload remains available only as V1 transitional infrastructure.
- `apps/web` remains a frozen V1 renderer.

## Future Platform API And SDK Relationship

Future Sharoz Connected websites will use server-side website credentials to call Platform APIs. The future `@sharoz/sdk` will wrap those APIs and enforce module-aware contracts from custom website code.

The module enablement table created in this milestone will become the authorization source for future Platform API and SDK module access.

Next milestone:

**V2 Milestone 3 — Website API Credentials and Platform Authentication Boundary**
