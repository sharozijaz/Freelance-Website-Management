# Authentication & Authorization

Milestone 5 establishes the shared authentication foundation for the Agency Website Platform. The dashboard now provides the production sign-in screen for the shared Better Auth credential flow. Dashboard product features, CMS collections, and business workflows remain outside the auth package.

## Goals

- Provide one reusable authentication package for Dashboard, CMS, Website, Client Portal, and future APIs.
- Reuse the existing `users` table instead of creating a parallel identity model.
- Keep tenant authorization organization-aware through memberships.
- Centralize route guards, permission checks, session helpers, and client hooks.
- Prepare email verification, password reset, audit logging, and rate limiting integration points without committing to a production email or rate-limit provider yet.

## Package Layout

`packages/auth` contains the shared auth foundation:

- `server.ts` creates the Better Auth server instance using PostgreSQL and Drizzle.
- `client.ts` exposes the browser auth client, session hook, and basic auth actions.
- `middleware.ts` exposes a reusable Next.js route protection middleware.
- `permissions.ts` defines roles and permission evaluation.
- `guards.ts` provides server-side guard helpers for sessions, organizations, and permissions.
- `session.ts` manages active organization resolution and active organization cookie headers.
- `rate-limit.ts` defines provider-neutral rate-limit hooks.
- `redirects.ts` validates post-authentication return URLs and prevents open redirects.
- `bootstrap.ts` validates and protects the first Agency Owner bootstrap workflow.
- `types.ts` defines shared auth, session, membership, and audit event types.

Applications consume `@agency/auth`; they should not reimplement auth rules locally.

## Authentication Architecture

Better Auth owns:

- Sign in.
- Sign out.
- Password reset.
- Email verification tokens.
- Session creation and expiration.
- Secure session cookies.
- CSRF protection through Better Auth's request handling.
- Password hashing through Better Auth's email/password provider.

The platform owns:

- Organization membership.
- Role assignment.
- Permission evaluation.
- Active organization selection.
- Audit log integration.
- Application route guards.

The Dashboard wires the Better Auth App Router handler at `/api/auth/[...all]`. Browser users sign in at `/sign-in`; that page posts credentials through the shared Better Auth client to `/api/auth/sign-in/email`. `/api/auth/sign-in` is not a browser page and should not be linked from product UI.

## First Agency Owner Bootstrap

Public self-registration is intentionally disabled. The first Agency Owner is created with a one-time CLI command:

```bash
OWNER_EMAIL="owner@example.com" OWNER_PASSWORD="use-a-long-random-password" OWNER_NAME="Agency Owner" OWNER_ORGANIZATION_NAME="Agency Platform" pnpm bootstrap:owner
```

PowerShell:

```powershell
$env:OWNER_EMAIL="owner@example.com"; $env:OWNER_PASSWORD="use-a-long-random-password"; $env:OWNER_NAME="Agency Owner"; $env:OWNER_ORGANIZATION_NAME="Agency Platform"; pnpm bootstrap:owner
```

The command:

- Validates the email and password.
- Uses Better Auth's email/password provider to hash and store credentials.
- Marks the bootstrap owner as email verified so local sign-in works without a production email provider.
- Creates the first organization and an active `agency_owner` membership.
- Writes an audit log entry.
- Refuses to run if any active Agency Owner already exists.
- Never prints or hardcodes the password.

## Database Integration

The auth package reuses the existing `users` table. The database foundation has been extended with the Better Auth tables:

- `auth_sessions`: stores session tokens, expiry, request metadata, and optional active organization reference.
- `auth_accounts`: stores credential and provider account data, including hashed password values for the email/password provider.
- `auth_verifications`: stores email verification and password reset token data.

The existing `users` table now includes `email_verified`, which is required by Better Auth and future email verification workflows.

Memberships remain in the platform schema because authorization is tenant-aware and platform-specific.

## Authorization Architecture

Authorization is evaluated through organization memberships.

Supported roles:

- `agency_owner`
- `agency_admin`
- `client_admin`
- `editor`
- `writer`
- `viewer`

Each role maps to named permissions in `packages/auth/src/permissions.ts`. Components and pages must ask for permissions through helpers instead of hardcoding role checks.

Permission flow:

1. Load the authenticated session.
2. Load active memberships for the session user.
3. Resolve the active organization.
4. Find the user's membership for that organization.
5. Evaluate role permissions plus explicit membership permissions.
6. Allow or deny the action.

## Session Lifecycle

1. User signs in through Better Auth.
2. Better Auth validates credentials, handles password hashing, and creates a session.
3. The session token is stored in a secure HTTP-only cookie.
4. Server helpers load the session from request headers.
5. Memberships are loaded from the database for tenant-aware authorization.
6. The session expires after the configured lifetime or is removed on sign out.

Default session policy:

- Session lifetime: 7 days.
- Refresh interval: 1 day.
- Fresh session window: 30 minutes.
- Secure cookies in production.
- Cookie prefix: `agency`.

## Organization Switching

Users may belong to multiple organizations. The active organization is resolved from:

1. A preferred organization ID, usually from an HTTP-only cookie.
2. The active organization value stored on the session when available.
3. The first active membership as a fallback.

Switching organizations should validate that the user has an active membership in the requested organization before setting the active organization cookie. UI for organization switching is intentionally not included in this milestone.

## Route Protection

`createAuthMiddleware` provides cookie-based route protection for Next.js App Router applications. It performs a lightweight session-cookie check suitable for redirects.

Unauthenticated protected dashboard routes redirect to `/sign-in?callbackUrl=<safe-relative-path>`. Callback URLs are sanitized through `getSafeRedirectPath`, so external URLs and protocol-relative URLs fall back to `/`.

Full authorization must still happen in server actions, route handlers, and server components through session and permission guards.

## Payload CMS Relationship

Dashboard authentication uses Better Auth sessions and the shared `users` plus `memberships` tables. Payload CMS currently has its own admin/session boundary and collection access helpers that expect a Payload request user with organization membership context. The two systems are not silently merged. A future CMS SSO milestone should explicitly bridge Better Auth identity into Payload admin access, including session exchange, role mapping, and audit logging.

## Security Standards

- Credentials are handled by Better Auth.
- Passwords are hashed by Better Auth before storage.
- Session cookies are HTTP-only.
- Secure cookies are enabled in production.
- CSRF protection is handled by Better Auth endpoints.
- Password length is constrained to 12-128 characters.
- Email verification is required before email/password access.
- Rate-limit hooks are provider-neutral and ready for Redis, Upstash, Cloudflare, or another provider later.
- Audit hooks are exposed for sign-in, sign-out, password reset, email verification, organization switching, and permission denial events.

## Future App Usage

Dashboard, CMS, Website, Client Portal, and APIs should all import shared auth utilities from `@agency/auth`.

Future modules should:

- Use `getSessionContext` to load the current user and memberships.
- Use `requireSession` before private actions.
- Use `requirePermission` before tenant mutations.
- Store module-specific authorization rules as permissions, not scattered role checks.
- Add production email and rate-limit providers through the existing hooks.
