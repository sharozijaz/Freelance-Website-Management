# Agency Operations Dashboard

Milestone 12 introduces the first production-ready operations interface for agency users. The dashboard is intentionally not an analytics product or a generic SaaS template. It is a daily work surface for moving between client workspaces, checking operational status, opening CMS workflows, and managing team access.

## Information Architecture

The dashboard shell contains persistent desktop navigation and compact mobile navigation:

- Overview: agency-wide operational summary for agency roles.
- Clients: searchable list of client organizations with creation and open-workspace actions.
- Client Workspace Overview: client-specific summary for websites, content, members, invitations, activity, and attention items.
- Websites: scoped website inventory from the shared `websites` table.
- Content: operational gateway into Payload CMS. It does not replace the CMS editor.
- Team: active-workspace member and invitation management.
- Settings: placeholder for future settings modules.

Prepared future modules include Deployments, Domains, SEO, Forms, and Analytics.

## Agency Versus Client Workspace Behavior

Agency Overview is used when no active organization cookie is selected. Client Workspace mode is used when `agency_active_organization_id` is set and verified server-side. The shell always displays the current user, current workspace, and whether the user is in agency or client context.

Agency owners can list and open all active client organizations. Agency admins and client users are scoped by their active memberships and permissions. Switching workspaces uses the existing organization switch service and secure HTTP-only active organization cookie.

## Data Access Architecture

Dashboard screens call service/query modules in `apps/dashboard/lib/dashboard` instead of embedding database logic in UI components. Queries are server-side, permission-aware, tenant-aware, and use URL search parameters for search, filtering, sorting, and pagination inputs.

The dashboard reads existing shared tables:

- `organizations`
- `memberships`
- `invitations`
- `websites`
- `pages`
- `posts`
- `audit_logs`

Payload CMS remains the editor. The dashboard content screen only routes users into Payload CMS workflows and displays synchronized placeholder content records where available.

## Permission Enforcement

Button visibility is not the authorization boundary. Query services and route handlers enforce existing RBAC helpers from `packages/auth`.

- Agency Owner: agency-wide operational access.
- Agency Admin: agency operations over organizations where membership permissions allow it.
- Client Admin: organization operations inside their own workspace.
- Editor and Writer: content-oriented access.
- Viewer: read-only access where permissions allow.

Unauthorized screens render explicit empty states instead of leaking data.

## Activity Presentation

Audit logs are mapped through a presentation layer before display. Internal events such as `invitation.created` become human-readable items such as "Sharoz invited a team member." Unknown events degrade to a safe generic message and do not expose raw resource metadata.

## Attention Rule System

The attention system is lightweight and derived from existing data. Current rules flag:

- Pending invitations nearing expiration.
- Active websites missing primary domains.
- Websites with failed deployment status.
- Suspended organizations.
- Draft content.

Future modules can register additional rules by producing the shared `AttentionItem` shape.

## Adding Future Dashboard Modules

Future dashboard modules should follow this pattern:

1. Add server-side query functions under `apps/dashboard/lib/dashboard`.
2. Enforce permissions in the query or action layer.
3. Keep UI components thin and reusable.
4. Use URL search parameters for filters and pagination.
5. Add activity mappings for new audit events.
6. Add attention rules only from real data states.
7. Route editing workflows to the owning system, such as Payload CMS, instead of duplicating editors.

## Manual Verification

Recommended verification workflow:

1. Sign in as an Agency Owner.
2. Open Agency Overview and confirm real client/workspace counts.
3. Open Clients, search, filter, and create a client organization.
4. Open a client workspace and verify the active workspace changes.
5. View the client's websites, recent content, team, invitations, activity, and attention items.
6. Open Content and confirm actions route to Payload CMS.
7. Invite, update, suspend, reactivate, remove, or revoke a permitted member/invitation.
8. Return to Agency Overview and open another client.
9. Confirm data from the previous client does not appear in the new client workspace.
10. Repeat permission checks with Agency Owner, Client Admin, Editor, and Viewer contexts.

## Known Limitations

The dashboard uses existing placeholder `pages` and `posts` tables for operational content summaries. Full Payload content synchronization and scheduling states remain future work. Deployment, domain, SEO, forms, analytics, invoicing, AI features, and project management are intentionally not implemented in this milestone.
