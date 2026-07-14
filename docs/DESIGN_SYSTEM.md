# Agency Website Platform Design System

> **V2 boundary notice:** This design system remains useful for dashboard, admin, and internal platform UI. V2 public websites must not be required to use `@agency/ui` or the dashboard design system; custom website presentation stays local to each website. See [ADR-001](adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md) and [V2 Architecture Guardrails](V2_ARCHITECTURE_GUARDRAILS.md).

## Purpose

The design system is the shared visual and interaction foundation for the dashboard, CMS, and all future client websites. It keeps the platform consistent while allowing each tenant website to express its own brand through controlled theme overrides.

This document defines how tokens, themes, UI foundations, Tailwind, and future shadcn/ui components should be used.

## Design Principles

### Consistency

Reusable tokens and foundations should be used before local styles. A dashboard card, CMS panel, and client website surface should share the same spacing, color, radius, shadow, and typography language unless a product requirement says otherwise.

### Accessibility

Color, focus states, motion, spacing, and typography must support readable, keyboard-friendly, screen-reader-compatible interfaces. Components should preserve semantic HTML and visible focus styles.

### Scalability

New clients should not require new design infrastructure. Tenant themes should override semantic tokens, while shared components continue to consume the same token names.

### Maintainability

Design decisions live in shared packages. Apps should not redefine token systems, duplicate component foundations, or hardcode brand-specific values.

## Naming Conventions

Tokens use semantic names whenever a value affects product meaning:

- `primary`
- `secondary`
- `success`
- `warning`
- `error`
- `info`
- `background`
- `foreground`
- `surface`
- `muted`
- `border`
- `ring`

Primitive scales use predictable numeric or size names:

- neutral colors use `50` through `950`
- spacing follows a 4px scale
- radius uses `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `full`
- shadows use `xs`, `sm`, `md`, `lg`, `xl`
- durations use `fast`, `normal`, `slow`, `slower`
- z-index uses intent names such as `dropdown`, `modal`, `toast`, and `tooltip`

Components should use semantic utilities like `bg-surface`, `text-foreground`, `border-border`, and `ring-ring` instead of raw colors.

## Token Usage

The token source of truth lives in `packages/ui`.

CSS tokens are defined in:

```txt
packages/ui/src/styles/globals.css
```

TypeScript token references are defined in:

```txt
packages/ui/src/tokens/index.ts
```

Application styles should import the shared design system:

```css
@import "@agency/ui/styles";
```

Do not duplicate token definitions in individual apps. App-specific CSS should be limited to app-level composition and rare overrides.

## Token Categories

### Typography

The system defines font families, font sizes, font weights, line heights, and letter spacing. Typography should use shared utilities and foundation components before local styles.

### Colors

The system includes primary, secondary, success, warning, error, info, and neutral `50-950`. Components should use semantic color roles rather than tenant-specific values.

### Spacing

Spacing follows a 4px scale. Layout components should use token-based Tailwind utilities such as `gap-4`, `p-6`, and `py-16`.

### Radius and Shadows

Radius and shadow tokens create a consistent visual language across dashboard surfaces, CMS controls, and websites. Tenant themes may adjust the radius scale through `--radius`.

### Opacity, Z-Index, Motion

Opacity, z-index, animation durations, and animation easings are centralized so overlays, dialogs, menus, tooltips, and transitions behave predictably.

## Theming Strategy

Themes are tenant-aware but token-compatible.

Each future client website may override:

- primary color
- secondary color
- fonts
- logo
- favicon
- border radius
- container width
- light mode
- dark mode

Theme values should be loaded from tenant site settings and translated into CSS variables at the app boundary. Components should not know which client is active. They should only consume semantic tokens.

This supports multi-tenancy because every tenant can have different brand values while the underlying React components, Tailwind utilities, accessibility behavior, and layout primitives remain shared.

## Component Philosophy

The design system separates foundations, components, and sections.

Foundations:

- Container
- Section
- Grid
- Stack
- Flex
- Typography
- Icons
- Surface
- Elevation

Components:

- Buttons
- Cards
- Forms
- Tables
- Dialogs
- Navigation primitives
- Feedback components

Sections:

- Hero variants
- Pricing variants
- FAQ variants
- CTA variants

Milestone 2 only creates foundations. Website sections are intentionally excluded until later milestones.

Future components should inherit the design system automatically by using the shared CSS variables and shadcn-compatible token names.

## Tailwind Strategy

Tailwind is configured through the shared CSS token layer. Apps import `@agency/ui/styles`, which defines theme variables, semantic colors, spacing, containers, breakpoints, shadows, radius, and motion values.

Apps should include the UI package as a Tailwind source so shared components are scanned:

```css
@source "../../../packages/ui/src/**/*.{ts,tsx}";
```

Avoid arbitrary one-off values when a token exists. If a new value is needed repeatedly, add it to the design system instead of hardcoding it in an app.

## shadcn/ui Strategy

shadcn/ui should use CSS variables and the shared `cn()` utility from `@agency/lib`. New shadcn components should be added to `packages/ui` so dashboard, CMS, and websites share the same implementation.

The shadcn token names should map to the platform token system:

- `background`
- `foreground`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `muted`
- `muted-foreground`
- `border`
- `input`
- `ring`

This ensures future shadcn components automatically inherit tenant themes.

## Accessibility Standards

Design-system components must:

- preserve semantic HTML
- support keyboard navigation
- expose visible focus states
- avoid color-only meaning
- support dark mode and light mode
- meet WCAG AA contrast targets for normal text
- respect reduced-motion preferences when animations are added
- keep icon-only controls accessible through labels or surrounding text

Foundation components should avoid hiding semantics. For example, typography foundations should render real heading and text elements, and layout foundations should not replace meaningful landmarks.

## Multi-Tenant Theme Flow

The future CMS will store tenant theme settings. At request time, the website will resolve the tenant, load the tenant theme, and apply CSS variables to the document.

Flow:

1. Resolve tenant from domain.
2. Load tenant theme settings.
3. Convert theme settings into CSS variables.
4. Render shared components using semantic tokens.
5. Allow light and dark mode to switch token values without replacing components.

Because components consume only token names, future tenant branding does not require duplicating components or forking website code.
