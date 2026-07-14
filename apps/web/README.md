# Web App Legacy Notice

`apps/web` is the V1 public website renderer.

For Sharoz Platform V2, this app is **FROZEN LEGACY**. It renders Payload pages, posts, layouts, blocks, navigation, site settings, and starter sections. New V2 features must not expand this renderer or depend on its block architecture.

Custom public websites own presentation and should communicate with Sharoz Platform through Platform APIs and the future `@sharoz/sdk`.

See:

- [V2 Platform Architecture](../../docs/adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md)
- [V1 Legacy Boundaries](../../docs/V1_LEGACY_BOUNDARIES.md)
- [V2 Architecture Guardrails](../../docs/V2_ARCHITECTURE_GUARDRAILS.md)
