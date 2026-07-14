# Starter Website Kit

> **V2 legacy notice:** This document describes the V1 Starter Website Kit inside `apps/web`. V2 custom public websites own their own React sections and are not required to use `@agency/ui`, the dashboard design system, Payload blocks, or the V1 starter kit. See [ADR-001](adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md) and [V1 Legacy Boundaries](V1_LEGACY_BOUNDARIES.md).

Milestone 9 introduces the first production-ready section pack for the Agency Website Platform. These sections are CMS-driven blocks that register with the shared Block Engine and render through the Website Rendering Engine.

## Purpose

The Starter Website Kit gives future client websites a reusable baseline of common marketing sections. New sites should compose these sections before creating new bespoke sections.

## Folder Structure

Starter sections live in `apps/web/features/blocks/sections`.

- `shared.tsx` contains reusable section primitives for calls to action, media, ratings, checks, and section framing.
- One file per section owns its typed content model, defaults, schema metadata, renderer, and block definition.
- `index.ts` exports `starterBlockDefinitions` for the central registry.
- `apps/web/features/blocks/definitions.ts` merges starter sections with placeholder definitions for block types that are planned but not implemented yet.

## Implemented Sections

- `hero`
- `logo-cloud`
- `features`
- `services`
- `statistics`
- `testimonials`
- `pricing`
- `faq`
- `cta`
- `footer`

## Registration Process

Every starter section exports a `BlockDefinition` with:

- `id`: stable registry identifier, for example `starter.hero.v1`
- `type`: Payload block type, for example `hero`
- `name`: editor-friendly display name
- `category`: registry grouping
- `version`: section contract version
- `component`: renderer component
- `schema`: CMS field metadata placeholder
- `icon`: editor icon token
- `previewImagePlaceholder`: future preview asset path

`starterBlockDefinitions` is imported by the core definitions module. If a starter section exists for a type, it replaces the placeholder definition. Planned sections that are not part of the Starter Kit remain registered as placeholders.

## Props And Content Model

Every renderer receives the standard Block Engine props:

- `block`: normalized CMS block data
- `context`: rendering context from the Website Rendering Engine

Section content is typed per block and stored under `block.content`. Settings, visibility, responsive options, animation settings, and theme overrides continue to flow through the generic block contract.

## Schema Strategy

Schemas currently describe the CMS field shape without coupling the section renderer to Payload internals. Payload collections can map these schema descriptors into real editor fields in a future milestone.

Each section owns its schema so it can evolve independently. Versioned block definitions allow future migrations without breaking existing pages.

## Theme And Design System Usage

Sections consume the shared component library and token-backed utility classes. They avoid fixed colors and use semantic tokens such as `primary`, `muted`, `foreground`, `background`, and `border`.

This means tenant themes can later override colors, typography, radius, spacing, shadows, and container behavior without rewriting sections.

## Accessibility Standards

Sections use semantic headings, links, buttons, navigation labels, image alt text from media metadata, and accessible UI primitives from `@agency/ui`.

Decorative video backgrounds are hidden from assistive technologies. Interactive elements remain keyboard reachable through shared components.

## Future Extension Strategy

To add a new section:

1. Create a file in `apps/web/features/blocks/sections`.
2. Define the typed content interface.
3. Add defaults that keep empty CMS states stable.
4. Define the block schema.
5. Build the renderer using shared UI primitives.
6. Export a versioned `BlockDefinition`.
7. Add the definition to `starterBlockDefinitions`.

Future sections should reuse `shared.tsx` helpers and existing `@agency/ui` components before adding new primitives.

## Integration Flow

Payload CMS stores layout blocks. The Website Rendering Engine normalizes those blocks and passes them to the Block Engine. The registry finds the matching starter section by block type and renders it with the active theme and design tokens.
