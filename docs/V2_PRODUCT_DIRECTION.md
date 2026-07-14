# V2 Product Direction

Sharoz Platform V2 is a modular headless CMS and agency control plane for custom-coded client websites.

The platform is built around the agency workflow:

```text
Client request
-> Figma design
-> Codex builds the custom website or app
-> Sharoz Platform manages the website, content, business modules, hosting, domains, and operations
-> Client updates approved areas through the dashboard
-> Agency maintains, supports, and improves the website over time
```

## Product Vision

Sharoz Platform helps a web design agency manage many different client websites from one secure system.

Clients may need very different products:

- static business websites
- marketing websites with editable content
- websites with blogs
- restaurant or takeaway ordering sites
- pet service booking sites
- ecommerce or catalog sites
- WordPress or legacy websites that still need operational support
- custom web applications

The platform should not force every client into one generic visual page builder. Instead, it provides reusable backend modules, operational tooling, and client access controls while allowing every public website to be custom-designed and custom-coded.

The long-term goal is to become the agency's daily operating system for website delivery, support, maintenance, content management, and modular business workflows.

## What The Platform Is

Sharoz Platform is:

- a centralized agency dashboard
- a modular headless CMS
- a website operations system
- a secure client content and workflow portal
- a backend module provider for custom-coded websites
- a control plane for hosting, domains, environments, deployments, forms, media, SEO, blog content, catalogs, orders, bookings, and future modules

The platform owns shared backend capabilities.

Custom client websites own presentation, layout, and bespoke frontend experience.

## What The Platform Is Not

Sharoz Platform V2 is not primarily:

- a drag-and-drop website builder
- a generic page-builder replacement for Webflow
- WordPress 2.0
- a system where every website must use the same frontend renderer
- a system where Payload CMS controls public website presentation
- a replacement for custom design and custom code

Visual editing may exist later for specific content types, but it is not the core V2 product direction.

## Agency Workflow

The target workflow is:

1. A client requests a website or web app.
2. The agency designs the experience in Figma.
3. Codex builds the custom website/app using the approved design, assets, and requirements.
4. The website is registered in Sharoz Platform.
5. Required modules are enabled for that website.
6. The website receives environment-scoped API credentials.
7. The custom website consumes data from Sharoz Platform through the Platform API or SDK.
8. The client signs into Sharoz Platform to manage only the content or workflows they are allowed to manage.
9. The agency manages hosting, domains, deployments, maintenance, support, and future updates.

This keeps custom frontend quality high while avoiding one-off backend rebuilds for every client.

## Sharoz Connected Website

A Sharoz Connected Website is a custom-coded website or app that uses Sharoz Platform as its backend control plane.

It has:

- a website record in the dashboard
- one organization owner
- staging and production environments
- enabled modules
- environment-scoped API credentials
- optional domains and hosting records
- optional deployment records
- access to Platform API endpoints based on enabled modules

The connected website authenticates as a website environment, not as a dashboard user.

The Platform API derives the website identity from the credential:

- organization id
- website id
- environment id
- environment type
- credential id

Custom websites must not send trusted organization, website, or environment identity in query parameters or request bodies.

## Website Types

V2 supports multiple website types:

- `sharoz_connected`: custom websites that use Sharoz Platform modules.
- `wordpress`: existing WordPress websites managed operationally.
- `external_legacy`: externally managed or older websites tracked for maintenance and support.

This allows the agency to manage current clients while gradually moving new work to the Sharoz Connected model.

## Module Strategy

Modules define capabilities that can be enabled per website.

Initial and planned modules include:

- Blog
- Forms
- Media
- SEO
- Catalog
- Orders
- Customers
- Booking

Modules are feature gates and backend boundaries. A module should provide:

- dashboard management UI
- database model
- tenant isolation
- permissions
- optional Platform API endpoints
- optional SDK helpers
- operational audit trail where appropriate

Not every module is equally complete today. Some modules are foundations or roadmap capabilities.

## Module Maturity

Current practical status:

- Blog: strongest first candidate for a complete end-to-end module.
- Forms: foundation exists and should become the second complete module.
- Media: foundation exists and needs dashboard polish.
- SEO: operational foundation exists and should support website metadata workflows.
- Catalog: planned for menus, products, services, and listings.
- Orders: planned for takeaway, ecommerce, and service order workflows.
- Customers: planned for customer profiles and customer-owned activity.
- Booking: planned for appointments, reservations, and service requests.

The platform should complete one module end-to-end before expanding too many modules in parallel.

## Client Responsibilities

Clients should be able to:

- sign in securely
- manage assigned websites
- edit allowed module content
- write and publish blog posts where permitted
- view form submissions where permitted
- manage catalog/menu items where permitted
- view orders or booking requests where permitted
- upload media where permitted
- review basic website status

Clients should not be able to:

- access other clients' data
- manage platform-wide settings
- view secrets or raw API credentials after creation
- change production-critical settings unless explicitly permitted
- bypass agency-owned workflows

## Agency Responsibilities

The agency should be able to:

- manage all clients and workspaces
- create and manage projects
- register websites
- enable/disable modules
- manage hosting records
- manage domains and environments
- create website API credentials
- record deployments
- review launch readiness
- manage user access
- handle maintenance and support
- track legacy WordPress/external websites
- manage backups, migrations, and production operations

The platform should make agency maintenance work easier across dozens of clients.

## Legacy Boundaries

The earlier V1 architecture included:

- Payload CMS
- visual page builder concepts
- reusable public website renderer
- starter website sections
- block engine

These pieces are not the primary V2 direction.

They may remain in the repository temporarily for reference, migration, or future selective reuse, but they should not drive new V2 product work unless deliberately re-scoped.

V2 should prioritize:

- dashboard control plane
- modular headless content/business backend
- Platform API
- SDK
- custom-coded website integration
- agency operations

## Product Principles

1. Custom websites stay custom.
2. Shared backend modules should be reusable across clients.
3. Clients manage only the areas they need.
4. Agency operations should be centralized.
5. Tenant isolation is mandatory.
6. Website credentials are environment-scoped.
7. Platform APIs derive identity from credentials.
8. Generic page-builder features should not block real client workflows.
9. Complete one module end-to-end before broadening the roadmap.
10. Production stability matters more than adding more placeholder modules.

## Next Roadmap

### Phase 0: Production Stabilization

Goal: make the current production app reliable.

Scope:

- commit production hotfixes back into the repo
- fix server-action error handling
- stabilize domain workflows
- document cPanel deployment
- verify all sidebar routes
- verify production health and database connection
- confirm backup and migration process
- cleanly mark V1 legacy boundaries

### Phase 1: Product Alignment

Goal: align docs, roadmap, and implementation around the modular headless CMS direction.

Scope:

- update architecture references where needed
- clarify module maturity
- define dashboard permissions by role
- define connected website workflow
- define MVP module order

### Phase 2: Blog Module End-to-End

Goal: complete the first real Sharoz Connected module.

Scope:

- dashboard blog editor
- posts, categories, tags
- draft/published workflow
- featured image
- SEO metadata
- Platform API read endpoints
- SDK helpers
- example connected website integration
- production verification

### Phase 3: Forms Module End-to-End

Goal: let custom websites submit and manage form submissions through Sharoz Platform.

Scope:

- form definitions
- public submission API
- submissions inbox
- status and notes
- export workflow
- spam-protection architecture

### Phase 4: Media And Content Snippets

Goal: let clients safely manage common website content.

Scope:

- media manager polish
- image metadata
- reusable content snippets
- business info
- testimonials
- FAQs
- team members

### Phase 5: Catalog Module

Goal: support menus, products, services, and listings.

Scope:

- categories
- catalog items
- pricing
- images
- availability
- options/modifiers
- Platform API and SDK access

### Phase 6: Orders And Booking

Goal: support transactional client websites.

Scope:

- order capture
- order dashboard
- order statuses
- customer details
- booking requests
- service availability
- notifications architecture

### Phase 7: Agency Operations

Goal: support the agency's recurring client-management work.

Scope:

- maintenance plans
- subscription tracking
- website health checks
- support tasks
- security/update notes
- renewal reminders
- WordPress/external website operational tracking

## Immediate Priority

The next implementation work should be:

```text
Production Stabilization
```

After that, the first product module should be:

```text
Blog Module End-to-End
```

This proves the full model:

```text
Dashboard content management
-> Platform API
-> SDK
-> custom-coded website
-> client-managed updates
```

