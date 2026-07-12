# Block Engine

Milestone 8 creates the reusable Block Engine that future website sections will use. It does not implement the visual page builder, drag-and-drop editing, or real section designs.

## Purpose

The Block Engine gives every future section a consistent contract:

- CMS data shape.
- Registry metadata.
- Renderer lookup.
- Theming assumptions.
- Preview metadata.
- Extension path for editor and live preview workflows.

## Folder Organization

The engine lives in `apps/web/features/blocks`.

- `types.ts`: shared block API and persisted CMS block shape.
- `schema.ts`: base block schema contract.
- `definitions.ts`: core block registrations.
- `registry.ts`: central registry and registration API.
- `renderer.tsx`: runtime block renderer.
- `normalize.ts`: Payload block data normalization.
- `placeholder-block.tsx`: fallback UI for registered and unknown blocks.
- `index.ts`: public exports.

The website renderer calls the Block Engine through `features/renderer/block-renderer.tsx`.

## Block Lifecycle

1. A block type is registered in the registry.
2. Payload stores block data with `id`, `type`, `settings`, `content`, `theme`, `visibility`, `responsive`, `animation`, and optional SEO flags.
3. The page renderer receives `Pages.layout`.
4. The Block Engine normalizes raw Payload data.
5. The renderer looks up each block by `type`.
6. The registered component receives `{ block, context }`.
7. Unknown blocks render a safe fallback instead of breaking the page.

## Registered Core Types

The registry is prepared for:

- Hero
- Features
- Services
- About
- Gallery
- Statistics
- Testimonials
- Pricing
- FAQ
- Timeline
- Team
- Logo Cloud
- Blog Grid
- Rich Text
- Video
- CTA
- Contact
- Custom HTML
- Spacer
- Divider

These are registered as framework placeholders only. Real section implementations will come later.

## Registration Contract

Every block registers:

- `id`
- `type`
- `name`
- `category`
- `version`
- `component`
- `schema`
- `icon`
- `previewImagePlaceholder`

Block IDs should follow:

```text
namespace.block-type.v<version>
```

Example:

```text
core.hero.v1
```

## Future Developer Workflow

To create a real section later:

1. Create a typed section component.
2. Define its content and settings schema.
3. Add a `BlockDefinition`.
4. Register the definition with `blockRegistry`.
5. Add a preview image asset.
6. Add Payload block fields in the page builder milestone.
7. Add tests for rendering and missing-content states.

The component must accept the standard props:

```ts
{
  block,
  context,
}
```

No section should fetch its own page data. Data access stays in the renderer and query layer.

## Rendering Pipeline

Payload block data flows through:

```text
Payload Pages.layout
↓
normalizeBlocks
↓
blockRegistry.get(type)
↓
registered component
↓
theme-aware rendered section
```

This avoids duplicated rendering logic and keeps future sections interchangeable.

## Theming

Blocks automatically live inside the website app, which imports the shared design system. Future blocks should consume:

- Design tokens
- Shared UI components
- Tenant theme values
- Typography scale
- Spacing scale
- Dark mode classes
- CSS variables from the theme layer

Blocks should not hardcode client-specific colors, spacing, or typography.

## Preview Support

The registry includes `previewImagePlaceholder` and `schema` so future editor features can support:

- Editor previews
- Draft previews
- Drag-and-drop block selection
- Live preview
- Section library browsing

This milestone only prepares the data and registration architecture.

## Naming Conventions

- Block types use kebab case: `logo-cloud`, `rich-text`.
- Registry IDs include namespace and version: `core.logo-cloud.v1`.
- Component names use PascalCase.
- Placeholder preview paths live under `/block-previews/<type>.svg`.
- Persisted block data uses stable `id` and `type` fields.

## Why This Prepares Reusable Sections

The Block Engine separates section discovery, data shape, rendering, and fallback behavior. Future Hero, Pricing, FAQ, CTA, and other reusable sections can be added one at a time without changing the page renderer or existing pages.
