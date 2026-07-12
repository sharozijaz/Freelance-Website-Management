# Website and Project Management

Milestone 13 adds the agency delivery workflow that connects client organizations, website projects, and the actual website records managed by the platform.

## Domain Model

Projects and websites remain separate:

- `Organization` is the client workspace.
- `Project` represents the agency delivery workflow.
- `Website` represents the long-lived website/platform resource.

A project may reference one primary website through `projects.website_id`. The website can continue after the delivery project is completed.

## Project Lifecycle

Project status changes must go through the transition service in `apps/dashboard/lib/dashboard/projects.ts`.

Allowed transitions:

- Planning -> Design, On Hold, Cancelled
- Design -> Planning, Development, On Hold, Cancelled
- Development -> Design, Internal Review, On Hold, Cancelled
- Internal Review -> Development, Client Review, On Hold, Cancelled
- Client Review -> Internal Review, Ready to Launch, On Hold, Cancelled
- Ready to Launch -> Client Review, Live, On Hold, Cancelled
- Live -> Ready to Launch, Completed, On Hold
- On Hold -> Planning, Design, Development, Internal Review, Client Review, Cancelled
- Completed -> terminal
- Cancelled -> terminal

Legacy enum values remain in the database for compatibility, but the dashboard only exposes the controlled lifecycle above.

## Website Context

The dashboard now supports organization plus website scope. Server-side helpers validate website access before returning records:

- `getActiveWebsite`
- `requireWebsiteAccess`
- `withWebsiteScope`

These helpers verify the website belongs to an organization the user can access and that the requested permission is allowed by RBAC.

## Dashboard Screens

Milestone 13 adds:

- `/projects`
- `/projects/[projectId]`
- `/websites/[websiteId]`

The existing `/websites` screen now supports website creation and links to detail screens. The agency overview includes active project count and project navigation.

## CMS Integration

Website detail shows recent pages and posts scoped by both `organization_id` and `website_id`. Editing actions route into Payload CMS. The dashboard does not implement a second CMS editor.

## Attention Rules

The attention system now includes:

- Project target launch date approaching
- Project target launch date overdue
- Project stuck in a stage
- Project missing Figma URL during design
- Website missing connected project
- Website active/live without a primary domain

All rules are derived from existing database state.

## Security

Project and website mutations are handled by route handlers and domain services, not UI-only logic. The services enforce:

- Organization-scoped project access
- Organization-scoped website access
- RBAC permissions for project and website management
- Controlled project status transitions
- Figma URL validation

Internal notes are stored in project metadata and are only displayed on agency project detail screens.

## Known Limitations

This milestone does not add deployment automation, DNS/domain management, SEO tools, analytics, Kanban/task management, time tracking, invoicing, Figma API integration, or a visual page builder.
