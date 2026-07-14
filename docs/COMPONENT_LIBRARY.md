# Agency UI Component Library

> **V2 boundary notice:** `@agency/ui` is a shared internal platform component library. V2 public websites may use their own component systems and must not be forced to depend on `@agency/ui`. See [ADR-001](adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md) and [V2 Architecture Guardrails](V2_ARCHITECTURE_GUARDRAILS.md).

## Purpose

The component library in `packages/ui` is the shared interface layer for the dashboard, CMS, website template, and future client portal. It provides reusable, accessible, theme-aware components that do not contain business logic.

Components are imported from the package root:

```ts
import { Button, Card, Input, Modal } from "@agency/ui";
```

## Component Philosophy

The library is organized around reusable primitives, not product workflows.

Components should:

- consume design tokens through semantic classes
- support light mode, dark mode, and future tenant themes
- preserve accessible behavior and semantic HTML
- remain independent of authentication, CMS data, routing, billing, clients, projects, and websites
- follow shadcn/ui conventions for composition and naming
- expose typed props and refs where the underlying element supports refs

Components should not:

- hardcode brand colors
- fetch data
- know about organizations, users, websites, forms, or content
- duplicate styling already available through tokens or foundations
- create website sections such as heroes, pricing sections, or FAQs

## Naming Conventions

Use simple nouns for single components:

- `Button`
- `Input`
- `Badge`
- `Avatar`
- `Spinner`

Use compound names for component families:

- `CardHeader`
- `CardContent`
- `ModalContent`
- `DropdownItem`
- `TableHeader`
- `PaginationNext`

Use `Root`, `Trigger`, `Content`, `Item`, `Header`, `Footer`, `Title`, and `Description` patterns when wrapping accessible primitives.

The exported names should make composition obvious without requiring business context.

## Accessibility Rules

Every component must maintain or improve accessibility.

Required standards:

- visible focus states
- keyboard support for interactive primitives
- semantic HTML where possible
- screen-reader text for icon-only controls
- labels for form controls
- no color-only meaning
- disabled states must be conveyed visually and programmatically
- overlays must trap focus through accessible primitives
- toasts and loading states must expose status information when appropriate

For complex interactions, prefer Radix primitives because they provide strong accessibility behavior for keyboard navigation, focus management, ARIA attributes, and interaction patterns.

## Theming Rules

Components use semantic token classes such as:

- `bg-surface`
- `text-foreground`
- `bg-primary`
- `text-primary-foreground`
- `border-border`
- `ring-ring`
- `bg-muted`
- `text-muted-foreground`

Do not use one-off hex values or tenant-specific brand values inside components. Future tenant themes will override CSS variables, and components will inherit those values automatically.

## When to Create a New Component

Create a new component when:

- the UI pattern appears in at least two places
- the interaction has accessibility requirements
- a design pattern needs a stable API
- repeated styling would otherwise be copied
- the pattern belongs to the platform rather than a single feature

Examples:

- a reusable command menu primitive
- a data table toolbar
- a file upload dropzone
- a date picker

## When to Extend an Existing Component

Extend an existing component when:

- the desired behavior is a small variant of an existing primitive
- the visual difference can be expressed through `variant`, `size`, or composition
- the component already provides the required accessibility behavior
- the new use case does not need a separate API

Examples:

- add a `destructive` button variant instead of creating `DeleteButton`
- compose `Card`, `CardHeader`, and `CardContent` instead of creating a one-off panel
- use `Modal` for confirmation workflows instead of building a custom overlay

## Current Component Families

Typography and layout:

- `Heading`
- `Text`
- `Label`
- `Link`
- `Container`
- `Section`

Actions:

- `Button`
- `IconButton`

Inputs:

- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `RadioGroup`
- `Switch`

Display:

- `Card`
- `Badge`
- `Avatar`
- `Alert`
- `EmptyState`
- `Skeleton`
- `Spinner`
- `LoadingOverlay`
- `Divider`

Overlays and disclosure:

- `Tooltip`
- `Popover`
- `Dropdown`
- `Modal`
- `Drawer`
- `Tabs`
- `Accordion`
- `Toast`

Navigation and data:

- `Breadcrumb`
- `Pagination`
- `Table`

## Business Logic Boundary

Feature modules may compose UI components, but UI components must not import feature modules. The dependency direction should remain:

```txt
apps -> packages/ui -> packages/lib
```

This keeps the component library reusable across the dashboard, CMS, website template, and future client portal.

## Future Additions

Future components should be added only when they serve a reusable platform need. Website sections, page-builder blocks, CMS collections, and dashboard screens belong to later milestones and should not be added to `packages/ui/src/components` as business-specific components.
