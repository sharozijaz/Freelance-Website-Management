# Organizations And Client Workspaces

Milestone 11 establishes the real multi-client agency workflow. An organization represents a client workspace. Every workspace owns its websites, members, and CMS content.

## Organization Lifecycle

1. An agency owner or permitted agency admin opens the workspace verification surface.
2. They create a client organization with name, slug, contact metadata, timezone, and locale.
3. The platform validates the name, slug format, reserved slugs, and uniqueness.
4. The creator receives an active membership in the new organization.
5. An audit log records `organization.created`.
6. The organization appears in the user's accessible workspace list.

Organizations use the existing `organizations` table. Logo and contact information currently live in organization metadata so no duplicate tenant model is introduced.

## Active Workspace Architecture

The active workspace is stored with the existing secure `agency_active_organization_id` HTTP-only cookie.

Workspace switching flow:

1. User submits an organization id.
2. The server loads the authenticated session.
3. The server checks the submitted organization against memberships or agency-owner access.
4. If allowed, the server writes the active organization cookie.
5. Future server components, route handlers, CMS access helpers, and dashboard features resolve the active organization from the server-side session context.

Client-submitted organization ids are never trusted without membership verification.

## Membership Lifecycle

Memberships use the existing `memberships` table.

Supported roles:

- Agency Owner
- Agency Admin
- Client Admin
- Editor
- Writer
- Viewer

Supported operations:

- list members
- update role
- suspend membership
- reactivate membership
- remove member

Protection rules:

- client admins cannot assign agency roles
- agency admins cannot promote users to agency owner
- users cannot suspend or remove their own membership
- the final active agency owner cannot be modified or removed
- all member operations require server-side permission checks

## Invitation Lifecycle

Invitations use the existing `invitations` table.

```txt
Create Invitation
  -> Pending
  -> Mock Email Delivery
  -> User Opens Invite
  -> Validate Token
  -> Accept Invitation
  -> Create or Link User
  -> Create Membership
  -> Mark Invitation Accepted
```

Invitation tokens are random, cryptographically secure values. Only a SHA-256 hash is stored. Tokens expire, are single-use, and fail after revocation or acceptance.

The development email provider logs the invite URL and returns it to the minimal verification UI. The provider is replaceable through the `EmailProvider` interface.

## Tenant Isolation Strategy

Tenant isolation is enforced server-side through:

- session memberships
- active organization context
- reusable permission helpers
- organization-scoped database queries
- Payload CMS access functions

Future modules should consume the shared organization helpers instead of accepting arbitrary organization ids from the client.

Recommended pattern:

1. Load session context.
2. Resolve active organization.
3. Require membership or permission.
4. Apply organization scope to every query.
5. Fail closed if the organization context is missing.

## CMS Organization Integration

Payload collections already include `organizationId`. CMS access now:

- scopes client and editor reads to the active organization
- prevents writes into another active organization
- lets agency owners read across organizations when their RBAC role permits it
- keeps create/update/delete permission checks centralized

Pages, posts, media, navigation, redirects, authors, categories, tags, and site settings continue to use the shared CMS access helpers.

## Website Relationship

Organizations may own multiple websites through the existing `websites` table.

The website renderer remains compatible with Milestone 10:

```txt
Organization
  -> Websites
  -> Tenant-scoped CMS content
  -> Block renderer
```

`WEB_ORGANIZATION_ID` and optional `WEB_WEBSITE_ID` continue to scope public website rendering.

## Minimal Verification UI

The dashboard now includes functional verification surfaces:

- `/workspaces`
- `/workspaces/[organizationId]/members`
- `/invite/[token]`

These pages are intentionally minimal and are not the final Agency Dashboard design.

## Manual Verification

1. Sign in as an agency owner.
2. Open `/workspaces`.
3. Create a client organization.
4. Switch into that workspace.
5. Open the member screen.
6. Invite a client admin.
7. Open the returned development invite URL.
8. Accept the invitation.
9. Sign in as the invited client.
10. Confirm the client can only see their organization.
11. Confirm CMS content access is scoped to that organization.
12. Confirm attempts to switch to another organization are denied.

## Known Limitations

- This milestone does not build the full dashboard.
- Email delivery is a development/mock provider.
- Organization logo/contact fields are stored in metadata until final dashboard profile screens exist.
- Invitation acceptance can create/link users, but full account onboarding remains tied to the existing Better Auth flow.
- Website management screens are not implemented.
