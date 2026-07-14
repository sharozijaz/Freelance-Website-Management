# Agency Website Platform Architecture

> **V2 legacy notice:** This document describes the historical V1 Payload CMS and reusable website-template architecture. It is superseded as active V2 direction by [ADR-001: V2 Platform Architecture](docs/adr/ADR-001-V2-PLATFORM-ARCHITECTURE.md), [V1 Legacy Boundaries](docs/V1_LEGACY_BOUNDARIES.md), and [V2 Architecture Guardrails](docs/V2_ARCHITECTURE_GUARDRAILS.md). Do not use this document to justify new V2 dependencies on Payload page layout blocks, `apps/web` block rendering, platform-controlled page section composition, or requiring public websites to use `@agency/ui`.

## 1. Folder Structure

The platform should start as a pnpm monorepo with clear application and package boundaries.

```txt
apps/
  agency-dashboard/
    app/
    components/
    features/
    lib/
    middleware.ts
    next.config.ts
    package.json
  payload-cms/
    src/
      collections/
      globals/
      access/
      hooks/
      fields/
      migrations/
      plugins/
      payload.config.ts
    package.json
  website-template/
    app/
    components/
    features/
    lib/
    middleware.ts
    next.config.ts
    package.json

packages/
  ui/
    src/
      components/
      sections/
      registry/
      hooks/
      styles/
      tokens/
      themes/
      index.ts
  config/
    eslint/
    prettier/
    tailwind/
    typescript/
    env/
  types/
    src/
      auth.ts
      cms.ts
      database.ts
      tenant.ts
  lib/
    src/
      auth/
      db/
      permissions/
      seo/
      tenancy/
      validation/
      rate-limit/
      cache/

docs/
  architecture.md
  api.md
  security.md
  deployment.md

package.json
pnpm-workspace.yaml
turbo.json
.env.example
```

### Application Responsibilities

`apps/agency-dashboard` is the central SaaS dashboard for the agency team and client users.

`apps/payload-cms` is the editorial backend and content API, powered by Payload CMS.

`apps/website-template` is the reusable client website starter. Each deployed client website uses this template, receives a tenant identifier from its domain, and reads content from the central CMS.

### Package Responsibilities

`packages/ui` contains shadcn/ui-based shared components, reusable website sections, design tokens, theme utilities, and the section registry used by future client websites.

`packages/config` contains shared TypeScript, ESLint, Prettier, Tailwind, environment, build configuration, and shared design-system configuration.

`packages/types` contains shared domain types used across the dashboard, CMS, and website template.

`packages/lib` contains shared server utilities for auth, database access, tenant resolution, permissions, SEO, validation, caching, and rate limiting.

## 2. Database Schema

PostgreSQL is the system of record. Drizzle ORM should own schema definitions and migrations for platform-level tables. Payload CMS will manage content collections, while shared tables such as organizations, memberships, domains, and audit logs should remain explicit in Drizzle.

### Core Tables

```txt
organizations
  id uuid primary key
  name text not null
  slug text unique not null
  status enum(active, suspended, archived)
  plan enum(starter, growth, scale, enterprise)
  created_at timestamp
  updated_at timestamp

users
  id uuid primary key
  name text
  email text unique not null
  email_verified boolean
  image_url text
  created_at timestamp
  updated_at timestamp

memberships
  id uuid primary key
  organization_id uuid references organizations(id)
  user_id uuid references users(id)
  role enum(agency_owner, agency_admin, client_admin, editor, writer, viewer)
  status enum(invited, active, disabled)
  created_at timestamp
  updated_at timestamp
  unique(organization_id, user_id)

domains
  id uuid primary key
  organization_id uuid references organizations(id)
  hostname text unique not null
  type enum(primary, redirect, preview)
  status enum(pending, active, failed)
  vercel_project_id text
  vercel_domain_id text
  created_at timestamp
  updated_at timestamp

projects
  id uuid primary key
  organization_id uuid references organizations(id)
  name text not null
  status enum(planning, design, development, review, live, paused)
  figma_url text
  production_url text
  preview_url text
  created_at timestamp
  updated_at timestamp

form_submissions
  id uuid primary key
  organization_id uuid references organizations(id)
  form_id text not null
  source_url text
  payload jsonb not null
  status enum(new, read, archived, spam)
  created_at timestamp

invoices
  id uuid primary key
  organization_id uuid references organizations(id)
  external_provider text
  external_id text
  amount_cents integer
  currency text
  status enum(draft, open, paid, void, overdue)
  due_at timestamp
  created_at timestamp
  updated_at timestamp

analytics_events
  id uuid primary key
  organization_id uuid references organizations(id)
  domain_id uuid references domains(id)
  event_name text not null
  path text
  referrer text
  metadata jsonb
  occurred_at timestamp

audit_logs
  id uuid primary key
  organization_id uuid references organizations(id)
  actor_user_id uuid references users(id)
  action text not null
  resource_type text not null
  resource_id text
  metadata jsonb
  created_at timestamp
```

### Content Isolation

Every tenant-owned record must include `organization_id`.

All application queries must be scoped by `organization_id` from the current session, domain, or API token.

Database indexes should be tenant-aware, for example `(organization_id, slug)`, `(organization_id, status)`, and `(organization_id, created_at)`.

Unique content constraints should usually be tenant-scoped, for example one page slug per organization rather than globally unique slugs.

## 3. CMS Collections

Payload CMS should be configured with tenant-aware collections and reusable fields. Collections that belong to a client must include `organization`.

### Tenant-Owned Collections

`Pages`

- organization
- title
- slug
- parent
- visual page builder blocks
- status
- publishedAt
- seo
- redirects

`Blog Posts`

- organization
- title
- slug
- excerpt
- content
- featuredImage
- categories
- tags
- author
- status
- publishedAt
- scheduledAt
- readingTime
- relatedPosts
- seo

`Authors`

- organization
- name
- slug
- bio
- avatar
- socialLinks

`Categories`

- organization
- name
- slug
- description

`Tags`

- organization
- name
- slug

`Media`

- organization
- alt
- caption
- folder
- focalPoint
- mimeType
- width
- height
- sizes

`Navigation`

- organization
- name
- location
- items

`Footer`

- organization
- columns
- legalLinks
- socialLinks

`Forms`

- organization
- name
- slug
- fields
- notificationRules
- confirmationBehavior
- spamProtection

`Testimonials`

- organization
- name
- company
- role
- quote
- image
- rating

`Services`

- organization
- title
- slug
- summary
- content
- icon
- image
- seo

`Redirects`

- organization
- source
- destination
- statusCode
- enabled

### Visual Page Builder

Pages should use a complete visual, block-based page builder powered by Payload CMS Blocks. The builder replaces the simple `layout blocks` concept with a structured content model that allows editors to assemble full pages from approved reusable sections.

The page builder should support these block types:

- Hero
- Features
- About
- Services
- Portfolio
- Gallery
- Team
- Testimonials
- Statistics
- Pricing
- FAQ
- CTA
- Contact Form
- Rich Text
- Video
- Logo Cloud
- Timeline
- Blog Grid
- Spacer
- Custom HTML, optional and permission-restricted

Each block should have a stable block type, version, display label, field schema, preview metadata, and renderer mapping. Payload stores page content as an ordered array of blocks. The website template renders that array through the section registry, which maps block type and variant to a React section from the shared UI package.

Blocks should be composed from reusable fields where possible:

- eyebrow
- heading
- subheading
- rich text
- media
- links
- cards
- alignment
- background
- spacing
- visibility rules
- animation settings
- SEO-related structured data where relevant

New blocks can be added without changing existing pages because existing pages store explicit block type data and field values. Adding a new block registers a new schema and renderer for future use, while old pages continue to render through their existing block definitions. If an existing block needs to evolve, the platform should create a new block version or provide a migration path instead of mutating the meaning of previously saved content.

Custom HTML should be disabled by default for client roles. If enabled, it must be limited to trusted agency roles, sanitized, audited, and excluded from AI-generated defaults unless explicitly approved.

### Content Versioning Workflow

Payload should support a publishing workflow that includes drafts, revisions, restores, scheduled publishing, preview URLs, and content history.

Drafts allow editors and writers to work on pages, posts, navigation, and settings without changing the live website.

Revisions should be stored for important content collections so teams can compare changes, view who changed what, and restore a previous version when needed.

Restore Previous Version should create a new draft based on the selected revision rather than silently overwriting the current published version.

Scheduled Publishing allows pages and blog posts to publish automatically at a future date and time. Scheduled content should remain invisible on production websites until its publish window is active.

Preview URLs should be signed, time-limited, and tenant-scoped. A preview link should allow stakeholders to view draft page-builder content in the real website template before publishing.

Content History should show creation, edits, publishing events, scheduling changes, restores, and status transitions. Important events should also write to the platform audit log.

The expected workflow is:

1. Writer or editor creates a draft.
2. Editor assembles content with page-builder blocks.
3. Client admin or agency admin reviews a signed preview URL.
4. Content is published immediately or scheduled.
5. Payload triggers cache revalidation for affected tenant paths.
6. Previous versions remain available for comparison and restore.

### Globals

`Global Settings`

- agency name
- default brand
- platform SEO defaults
- analytics configuration
- email settings

`Site Settings`

- organization
- site name
- logo
- favicon
- default locale
- default SEO
- social profiles
- schema organization data
- robots policy
- theme settings
- header style
- footer style
- light mode settings
- dark mode settings

### Tenant-Aware Theme System

Each organization should have theme settings managed from Payload CMS through `Site Settings`. The website template resolves the organization from the hostname, loads the tenant theme, converts it into CSS variables and design tokens, and applies those values globally before rendering page content.

Each client website should be able to customize:

- logo
- favicon
- fonts
- primary color
- secondary color
- background colors
- button styles
- border radius
- shadows
- container width
- header style
- footer style
- dark mode
- light mode

Theme settings should not require custom code for routine brand changes. A client admin or agency admin should be able to update colors, typography, logos, button treatments, and layout preferences in the CMS, preview the result, and publish when approved.

The theme model should separate design decisions from content:

- brand assets define logos, favicons, and social images
- typography settings define heading and body font families, weights, and scale choices
- color settings define semantic tokens such as background, foreground, primary, secondary, muted, border, success, warning, and destructive
- shape settings define radius scale and component density
- elevation settings define shadow scale
- layout settings define container widths, section spacing, header style, and footer style
- mode settings define light and dark token values

Client websites should consume semantic tokens rather than raw brand values. For example, a button uses `primary` and `primary-foreground`; it should not know a client-specific hex color directly. This keeps components reusable across every tenant.

### Shared Field Groups

`seoFields`

- title
- description
- canonicalUrl
- openGraph
- twitterCard
- schema
- robots
- noindex

`publicationFields`

- status
- publishedAt
- scheduledAt

`tenantField`

- organization relationship
- required
- indexed
- access-controlled

## 4. User Flow

### Agency Owner

1. Signs in to the agency dashboard.
2. Creates an organization for a client.
3. Adds client details, domains, project metadata, and users.
4. Connects or deploys the website template.
5. Assigns roles to agency staff and client users.
6. Reviews analytics, form submissions, invoices, and site health from one dashboard.

### Agency Admin

1. Manages assigned clients.
2. Creates or edits pages, blog posts, media, forms, redirects, and SEO.
3. Publishes content or schedules changes.
4. Manages domain status and deployment previews.

### Client Admin

1. Signs in to the client-facing dashboard.
2. Views only their organization.
3. Manages allowed users.
4. Reviews pages, blog, media, forms, analytics, and settings.
5. Cannot access other clients or agency-level settings.

### Editor

1. Creates and edits pages, blog posts, media, navigation, and forms.
2. Can publish if granted by policy.
3. Cannot manage billing, domains, or users.

### Writer

1. Creates and edits blog drafts.
2. Uploads permitted media.
3. Submits content for review.
4. Cannot publish unless explicitly allowed.

### Viewer

1. Reads dashboard data and content.
2. Cannot modify records.

## 5. Authentication Architecture

Better Auth should handle identity, sessions, email verification, password reset, OAuth providers if needed, and organization-aware session metadata.

### Session Model

Each session should include:

- user id
- active organization id
- memberships
- active role
- permissions
- session expiry

The dashboard should require an active organization context for all tenant-scoped screens.

Agency owners and agency admins may switch between organizations.

Client users should only see organizations where they have an active membership.

### Authorization Model

Authentication answers "who are you?"

Authorization answers "what can you do here?"

Authorization should live in shared permission utilities in `packages/lib/src/permissions`.

Each protected server action, route handler, Payload access function, and dashboard page should call a shared permission helper before reading or mutating tenant data.

### Role Capabilities

```txt
agency_owner
  full platform access

agency_admin
  manage assigned organizations, content, domains, users, analytics

client_admin
  manage own organization content, users, forms, media, SEO

editor
  manage own organization pages, media, navigation, forms

writer
  manage own organization blog drafts and assigned posts

viewer
  read own organization data
```

## 6. Multi-Tenant Architecture

The platform should use shared infrastructure with strict tenant isolation at the application, CMS, and database layers.

### Tenant Resolution

Dashboard tenant resolution:

- derive available organizations from the authenticated user's memberships
- store active organization in the session or route segment
- validate every request against membership

Website tenant resolution:

- read request hostname
- match hostname to `domains.hostname`
- resolve `organization_id`
- fetch content scoped by that organization

CMS tenant resolution:

- agency users may select an organization
- client users are restricted to their organization
- Payload access controls automatically inject and validate organization filters

### Isolation Rules

No tenant-owned query may run without an organization scope.

No mutation may accept organization id blindly from the client.

All organization ids must be derived from the authenticated session, verified domain, or trusted server-side integration.

Payload collection access must enforce tenant filters for read, create, update, and delete operations.

Media assets must be tenant-owned, and media URLs should avoid leaking unpublished or private files.

### Scaling Model

The default model is a shared database and shared CMS with tenant-scoped rows.

If a high-value enterprise client requires deeper isolation later, the architecture can support dedicated Vercel projects, dedicated storage buckets, or dedicated databases while preserving the same dashboard and API contracts.

## 7. API Design

The platform should expose APIs through Next.js route handlers, Payload APIs, and server actions.

### API Principles

- All APIs are typed with TypeScript.
- All inputs are validated with Zod.
- All mutations check permissions server-side.
- Tenant scope is derived server-side.
- Public website APIs use domain-based tenant resolution.
- Internal dashboard APIs use session-based tenant resolution.
- Webhooks are signed and verified.
- Rate limits apply to auth, forms, public APIs, and webhook endpoints.

### API Groups

`/api/auth/*`

- Better Auth routes
- sign in
- sign out
- callback
- session

`/api/organizations`

- list organizations for current user
- create client organization
- update organization settings

`/api/projects`

- list projects
- create project
- update project status

`/api/domains`

- list domains
- add domain
- verify domain
- remove domain

`/api/content`

- tenant-scoped read APIs for pages, posts, navigation, footer, redirects, and settings

`/api/forms/:formId/submissions`

- submit public form
- validate fields
- apply spam checks
- store submission
- trigger notifications

`/api/media`

- signed upload flow
- media listing
- metadata update

`/api/analytics`

- ingest events
- query dashboard metrics

`/api/webhooks/vercel`

- deployment status
- domain status

`/api/webhooks/billing`

- invoice status
- subscription status

### Website Data Access

Client websites should prefer server-side data fetching with ISR where content can be cached.

Draft previews should use signed preview tokens.

Published content can be cached by organization, path, and content version.

## 8. Component Architecture

The UI should be built from shadcn/ui primitives in `packages/ui`, with feature-specific composition inside each app.

### Shared Design System

The design system should live in shared packages and be reusable across the dashboard, Payload-facing tools, and every client website.

`packages/ui/src/tokens`

- typography
- color system
- spacing scale
- border radius
- shadows
- container widths
- breakpoints
- icon system
- animation tokens
- z-index scale

`packages/config/tailwind`

- Tailwind presets
- shared theme extension
- content paths for monorepo apps
- plugin configuration
- dark mode strategy

`packages/ui/src/themes`

- default agency theme
- tenant theme adapter
- light mode variables
- dark mode variables
- theme validation helpers

The design system should use semantic tokens rather than raw visual values in components. A component should ask for `background`, `foreground`, `primary`, `border`, `radius`, and `shadow` tokens. The tenant theme decides what those values become.

Typography should define heading, body, mono, and display font roles with consistent font sizes, line heights, weights, and responsive behavior.

The color system should define semantic roles for surfaces, text, borders, actions, feedback states, charts, and page-builder section backgrounds.

The spacing scale should define consistent layout gaps, section padding, control sizes, and dashboard density values.

Border radius, shadows, container widths, breakpoints, animation tokens, and z-index values should be centralized so components behave consistently across all apps and all client websites.

The icon system should standardize Lucide React usage, icon sizes, stroke widths, accessible labels, and when icons should be decorative versus meaningful.

### Shared UI Package

`packages/ui/src/components`

- Buttons
- Cards
- Sections
- Containers
- Headings
- Navigation
- Footer
- Feature Cards
- Pricing Cards
- Service Cards
- Blog Cards
- Testimonial Cards
- Gallery
- Accordion
- Tabs
- Modal
- Carousel
- Timeline
- Forms
- Tables
- Badges
- Breadcrumbs
- Pagination
- Empty States
- Charts
- Toast Notifications
- Sidebar
- Navbar
- Dialog
- Dropdown
- Command Menu
- Theme Switcher
- Data Table
- Confirm Dialog

Every future website should reuse `packages/ui` components and sections before introducing new local components. Local website components are acceptable only when they are truly client-specific, experimental, or not yet generalized. Once a pattern repeats, it should be promoted into the shared package.

### Dashboard Feature Structure

```txt
apps/agency-dashboard/features/
  overview/
  clients/
  projects/
  domains/
  hosting/
  cms/
  analytics/
  forms/
  media/
  invoices/
  settings/
  users/
```

Each feature should own:

- server queries
- server actions
- Zod schemas
- route-specific components
- loading states
- empty states
- error boundaries

Shared dashboard components should move into `packages/ui` after a second real use case appears. Shared website sections should move into `packages/ui/src/sections` when they become part of the agency's repeatable delivery library.

### Website Template Components

```txt
apps/website-template/components/
  blocks/
  layout/
  seo/
  forms/
  blog/
  media/
```

The website template should render Payload page-builder blocks, navigation, footer, SEO metadata, schema, forms, and blog pages from tenant-scoped content.

### Section Registry

The platform should include a reusable section registry in `packages/ui/src/registry`. The registry maps CMS block types and section variants to approved React sections.

Example registry entries:

- Hero01
- Hero02
- Hero03
- Pricing01
- Pricing02
- FAQ01
- CTA01
- Footer01
- Footer02

The registry should track:

- section id
- block type
- variant name
- supported CMS fields
- required fields
- optional fields
- theme support
- responsive behavior
- accessibility notes
- preview metadata
- deprecation status

Codex should build future websites by composing existing registered sections first. When a Figma design maps closely to `Hero02`, `Pricing01`, and `FAQ01`, Codex should reuse those sections and adjust content, tokens, and configuration. Codex should create a new section only when the requested design introduces a genuinely new reusable pattern that cannot be represented by existing variants.

The goal is a growing agency-owned library of reusable website sections. Over time, new projects should become faster because each website is assembled from tested, accessible, SEO-friendly, theme-aware building blocks instead of starting from a blank page.

## 9. Deployment Architecture

Vercel should host the Next.js dashboard and client websites. Payload CMS can be deployed as a Node-capable service, preferably with managed PostgreSQL and persistent object storage.

### Environments

`local`

- local Postgres
- local Payload
- local Next.js apps

`preview`

- Vercel preview deployments
- preview database branch or isolated schema
- test object storage

`production`

- production Vercel projects
- production PostgreSQL
- production object storage
- production CMS

### Vercel Projects

`agency-dashboard`

- central authenticated dashboard
- protected routes
- Better Auth session integration

`website-template`

- deployed per client or as a multi-domain Vercel project
- resolves tenant by hostname
- uses ISR and cache revalidation

`payload-cms`

- deployed where Payload CMS runtime requirements are supported
- connects to PostgreSQL
- exposes admin UI and content APIs

### Domain Strategy

Each client has one primary domain and optional redirect domains.

Domains are stored in the platform database and synced with Vercel.

Requests to a client website resolve organization by hostname.

Domain verification and deployment status are tracked in the dashboard.

### Content Revalidation

When content changes in Payload:

1. Payload hook emits a revalidation event.
2. The platform resolves impacted organization and paths.
3. Website cache is revalidated by tag or path.
4. Sitemap and RSS output update automatically.

## 10. Technology Choices

### Next.js 15

Next.js provides server components, route handlers, streaming, metadata APIs, ISR, and first-class Vercel deployment. It is a strong fit for both the authenticated SaaS dashboard and SEO-focused client websites.

### React 19

React 19 gives the platform modern server/client composition patterns and prepares the codebase for current ecosystem conventions.

### TypeScript

TypeScript is required for a multi-app SaaS platform because shared contracts, permissions, API inputs, CMS data, and tenant-aware utilities need strict typing.

### Tailwind CSS

Tailwind enables fast, consistent UI development across the dashboard, CMS-adjacent tools, and website template while remaining easy to share through a monorepo config package.

### shadcn/ui

shadcn/ui provides accessible, composable primitives that the platform owns directly. This is better for a SaaS dashboard than depending on a closed design system with hard-to-customize behavior.

### Lucide React

Lucide React provides clean, consistent icons with excellent React support and pairs naturally with shadcn/ui.

### Motion

Motion adds polished interaction design for dashboard transitions, menus, dialogs, and website sections without forcing a heavy animation architecture.

### Payload CMS

Payload is code-first, TypeScript-native, highly customizable, and suitable for replacing WordPress-style content management while supporting custom collections, access controls, hooks, and admin workflows.

### PostgreSQL

PostgreSQL is reliable, relational, scalable, and well suited for tenant-scoped SaaS data, content relationships, analytics summaries, audit logs, and structured metadata.

### Drizzle ORM

Drizzle gives strongly typed SQL, explicit migrations, and a lightweight data layer. It fits a platform where schema ownership and query clarity matter.

### Better Auth

Better Auth is a modern authentication layer that can support sessions, organizations, OAuth, and framework-native integration without carrying legacy assumptions.

### Zod

Zod gives runtime validation for forms, APIs, server actions, webhooks, and environment variables while sharing inferred TypeScript types.

### React Hook Form

React Hook Form provides performant, ergonomic form state management and integrates well with Zod validation and shadcn/ui form components.

### Vercel

Vercel is the natural deployment target for Next.js applications, supports preview workflows, custom domains, edge caching, ISR, and a strong agency delivery model.

### pnpm

pnpm is fast, strict, and excellent for monorepos. Its workspace support keeps shared packages reliable without unnecessary dependency duplication.

## Security Architecture

Security must be designed into every layer rather than added at the end.

### Required Controls

- Better Auth sessions with secure cookies.
- CSRF protection for state-changing browser requests.
- Zod validation for every external input.
- Role and permission checks before every tenant mutation.
- Rate limiting for auth, forms, public APIs, and webhooks.
- Signed webhooks from Vercel and billing providers.
- Signed preview URLs for draft content.
- Sanitized rich text rendering.
- Strict environment variable validation.
- Audit logs for sensitive actions.
- No cross-tenant reads, writes, analytics, media, or cache leakage.

## SEO Architecture

SEO should be a first-class content model, not an afterthought.

### Per-Page SEO

Every page and post supports:

- SEO title
- meta description
- slug
- canonical URL
- Open Graph image and metadata
- Twitter Card metadata
- JSON-LD schema
- robots directives
- noindex
- image alt text
- automatic metadata generation

### Generated SEO Outputs

Each client website should generate:

- XML sitemap
- RSS feed
- breadcrumb schema
- article schema
- organization schema
- redirect rules
- canonical tags
- robots.txt

## Design-to-Code Workflow

The agency workflow should be:

```txt
Figma Design
  |
  v
Codex builds reusable React components
  |
  v
Components are added to the shared component library
  |
  v
Page is assembled using reusable blocks
  |
  v
Content comes from Payload CMS
  |
  v
Website is deployed
  |
  v
Future updates happen through the CMS
```

This workflow scales better than building every website from scratch because each completed project strengthens the platform. A new hero, pricing layout, testimonial section, or footer variant becomes part of the reusable library instead of remaining trapped in one client codebase.

Figma remains the creative source of truth for new design direction. Codex translates approved designs into reusable, typed, theme-aware React sections. Payload CMS then owns the content and page assembly, which means future copy, image, SEO, navigation, and layout updates can happen without rebuilding the website application.

The workflow also improves quality. Reused sections can accumulate accessibility fixes, responsive improvements, SEO enhancements, performance tuning, and animation polish over time. Every client benefits from that shared improvement instead of paying the quality cost separately.

## Future Roadmap

The following AI capabilities are roadmap items only and should not be implemented during the initial architecture or foundation phase.

### AI Blog Writer

Generate first drafts, outlines, titles, summaries, and content briefs for tenant-specific blog posts while preserving human review and approval.

### AI SEO Assistant

Analyze pages and posts for search intent, keyword coverage, internal linking opportunities, headings, schema, and metadata quality.

### AI Metadata Generator

Generate SEO titles, meta descriptions, Open Graph descriptions, Twitter Card text, and canonical recommendations from page content.

### AI Accessibility Checker

Review page-builder content and rendered pages for accessibility issues such as missing labels, weak heading structure, insufficient contrast, and unclear link text.

### AI Alt Text Generator

Suggest image alt text during media upload while allowing editors to approve, edit, or reject suggestions.

### AI Content Rewriter

Rewrite copy for tone, clarity, length, reading level, conversion intent, localization, or brand voice.

### AI Component Generator

Assist Codex in converting approved Figma sections into reusable, theme-aware React components that can be added to the section registry after engineering review.

### AI Design Suggestions

Suggest section variants, content hierarchy, layout improvements, and visual refinements based on the client's industry, brand settings, and website goals.

## Scalability and Maintainability Impact

These additions improve scalability because the platform now separates content, design tokens, themes, reusable sections, and tenant data. New clients can share the same infrastructure and component library while still receiving distinct branding and content.

Maintainability improves because components and sections have a single home. Bugs, accessibility fixes, performance improvements, and design refinements can be made once in the shared library and reused across future websites.

Code reuse improves because the section registry gives Codex and developers a clear default path: compose existing sections first, add new reusable variants second, and create one-off code only when the design truly requires it.

The agency workflow improves because Figma designs become reusable product assets, not disposable project artifacts. Payload CMS gives non-developers control over content and publishing, while the engineering team focuses on expanding the platform's durable capabilities.

## Initial Build Roadmap

The safest implementation order is:

1. Monorepo foundation.
2. Shared config packages.
3. Shared design tokens and theme architecture.
4. Shared UI primitives.
5. Section registry foundation.
6. Database schema and migrations.
7. Better Auth integration.
8. Tenant and permission utilities.
9. Payload CMS collections, page-builder blocks, and access controls.
10. Content versioning, previews, and scheduled publishing.
11. Agency dashboard shell.
12. Client dashboard routes.
13. Website template content rendering.
14. Domain management and deployment hooks.
15. SEO automation.
16. Analytics, forms, invoices, and operational modules.

This order keeps tenant isolation, authentication, and content ownership stable before user-facing features expand.
