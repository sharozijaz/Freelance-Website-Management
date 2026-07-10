# Database Foundation

## Purpose

The shared database package provides the PostgreSQL and Drizzle ORM foundation for the dashboard, Payload CMS, website app, and future APIs.

The package lives at:

```txt
packages/database
```

It contains:

- Drizzle schema
- Drizzle relations
- drizzle-kit configuration
- PostgreSQL client factory
- initial migration artifacts

It does not implement authentication, Payload collections, API routes, or business workflows.

## Package Structure

```txt
packages/database/
  drizzle.config.ts
  src/
    client.ts
    index.ts
    schema/
      core.ts
      enums.ts
      placeholders.ts
      index.ts
```

## Core Tables

### organizations

Stores tenant records. An organization represents a client.

Why it exists:

- Every tenant-owned resource is scoped to an organization.
- Organization status supports active, suspended, and archived lifecycle states.
- Organization plan supports future SaaS packaging.

Key relationships:

- one organization has many memberships
- one organization has many websites
- one organization has many projects
- one organization has many domains
- one organization has many invitations
- one organization has many audit logs

### users

Stores global user profiles prepared for future authentication.

Why it exists:

- Users can belong to multiple organizations.
- Authentication credentials will be added later by the authentication milestone.
- Profile, locale, timezone, avatar, status, and last login are available before auth is wired.

Key relationships:

- one user has many memberships
- one user can be assigned to many projects
- one user can send or accept invitations
- one user can appear as an audit actor

### memberships

Connects users to organizations.

Why it exists:

- Supports many-to-many users and organizations.
- Stores tenant-specific role, status, custom permissions, and invitation lifecycle timestamps.
- Provides the future authorization layer with a tenant-scoped membership record.

Tenant isolation:

- unique by `organization_id` and `user_id`
- indexed by organization role and organization status

### websites

Stores client website records.

Why it exists:

- A client can have one or more websites.
- Website status, theme, deployment status, primary domain, production URL, and preview URL are tracked centrally.

Tenant isolation:

- every website has `organization_id`
- slugs are unique within an organization

### domains

Stores domains connected to websites.

Why it exists:

- Domains are the public entry point for tenant resolution.
- Verification, DNS, SSL, and primary-domain state are tracked independently from website records.

Tenant isolation:

- every domain has `organization_id`
- every domain belongs to a website
- domain names are globally unique

### projects

Stores agency delivery work.

Why it exists:

- Tracks design, development, review, launch, and paused states.
- Connects project work to a client organization and optionally a website.
- Stores Figma URL and launch target date.

Tenant isolation:

- every project has `organization_id`
- project slugs are unique within an organization

### project_assignments

Connects users to projects.

Why it exists:

- Supports assigned users without embedding arrays inside projects.
- Keeps assignment records queryable and tenant-scoped.

Tenant isolation:

- includes `organization_id`
- composite primary key prevents duplicate assignment rows

### invitations

Stores user invitations before authentication is implemented.

Why it exists:

- Supports inviting users to organizations with a target role.
- Tracks pending, accepted, expired, and revoked states.
- Stores token hashes rather than raw invitation tokens.

Tenant isolation:

- every invitation has `organization_id`
- indexed by organization email and organization status

### audit_logs

Stores immutable operational history.

Why it exists:

- Tracks sensitive changes and platform activity.
- Supports future security review, compliance, and debugging.

Tracked fields:

- actor
- organization
- action
- resource type
- resource id
- metadata
- timestamp

## Placeholder Tables

The following tables are intentionally minimal. They reserve normalized tenant-aware relationships for future modules without implementing those modules yet.

### pages

Placeholder for future website pages and Payload-backed page-builder content.

### posts

Placeholder for future blog posts.

### media_assets

Placeholder for future media library records.

### forms

Placeholder for future form definitions.

### seo_metadata

Placeholder for resource-level SEO metadata.

### analytics_events

Placeholder for future analytics ingestion.

## Multi-Tenancy Model

The database uses shared PostgreSQL infrastructure with tenant-scoped rows.

Rules:

- tenant-owned tables include `organization_id`
- application queries must filter by `organization_id`
- unique constraints are tenant-aware where appropriate
- indexes are designed around organization-first access patterns

Examples:

- `websites` uses unique `(organization_id, slug)`
- `projects` uses unique `(organization_id, slug)`
- `pages`, `posts`, and `forms` use unique `(organization_id, website_id, slug)`
- `audit_logs` indexes `(organization_id, created_at)`

Users are global because one user may belong to many organizations. Access is determined through memberships.

## Soft Deletes

Soft delete support is included for lifecycle-managed records:

- organizations
- users
- memberships
- websites
- domains
- projects
- invitations
- placeholder content records where appropriate

Audit logs and analytics events are append-only and do not include soft deletes.

## Drizzle Commands

Generate migrations:

```bash
pnpm --filter @agency/database db:generate
```

Run migrations:

```bash
pnpm --filter @agency/database db:migrate
```

Open Drizzle Studio:

```bash
pnpm --filter @agency/database db:studio
```

## Environment

The database package expects:

```txt
DATABASE_URL=postgres://postgres:postgres@localhost:5432/agency_platform
```

Applications should pass a connection string into `createDatabaseClient`. The package does not read application secrets directly at runtime.

## Extension Path

Future modules should extend the database in this order:

1. Authentication credentials and sessions.
2. Payload CMS collection integration.
3. Full page and post content models.
4. Media storage metadata.
5. Form submissions.
6. SEO automation data.
7. Analytics rollups.

New tenant-owned tables must include `organization_id`, proper indexes, foreign keys, and audit-log support where relevant.
