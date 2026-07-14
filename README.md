# Sharoz Platform

Sharoz Platform V2 is the active product direction for this repository.

V2 is an agency control plane and modular website services platform. The dashboard manages organizations, websites, domains, deployments, modules, users, permissions, and operational workflows. Custom public websites own their own presentation and communicate with the platform through Platform APIs and the future `@sharoz/sdk`.

## Active V2 Direction

- The platform does not own public website React presentation.
- Custom public websites are not required to use `@agency/ui` or the dashboard design system.
- Sharoz Connected websites do not store page section composition in the platform.
- Website modules own explicit domain models, validation, permissions, API contracts, SDK contracts, and events.
- Better Auth browser sessions are for dashboard users.
- Website API credentials are a separate future authentication boundary.
- Payload CMS and the current `apps/web` renderer are V1 legacy/transitional areas.

## Required Architecture Documents

- [V2 Repository Audit](docs/V2_REPOSITORY_AUDIT.md)
- [ADR-001: V2 Platform Architecture](docs/adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md)
- [V1 Legacy Boundaries](docs/V1_LEGACY_BOUNDARIES.md)
- [V2 Architecture Guardrails](docs/V2_ARCHITECTURE_GUARDRAILS.md)
- [V2 Module Foundation](docs/V2_MODULE_FOUNDATION.md)
- [V2 Platform Authentication Boundary](docs/V2_PLATFORM_AUTH.md)
- [V2 Platform API And SDK](docs/V2_PLATFORM_API_AND_SDK.md)
- [V2 Blog Domain](docs/V2_BLOG_DOMAIN.md)

## Legacy Documentation

Several older documents describe the V1 Payload CMS page-builder direction. They are preserved for history and migration context only. New V2 work must follow the ADR and guardrails above.

The next implementation milestone is **V2 Milestone 2 — Website Type and Module Enablement Foundation**.
