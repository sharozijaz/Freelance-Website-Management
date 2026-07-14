# V2 Production Operations

This document defines the V2 production hardening, observability, recovery, and release workflow for the Sharoz Agency Website Management platform.

## Runtime Safety

The dashboard exposes a safe health endpoint at `/api/health`.

- `200` means the application is reachable and the database check passed.
- `503` means the application is reachable but at least one required dependency failed.
- Responses include `Cache-Control: no-store` and `X-Request-Id`.
- The health payload only reports safe check names and statuses. It must never include connection strings, credentials, SQL text, stack traces, or raw provider errors.

The health endpoint is both the liveness and readiness signal for V2. A separate liveness-only route can be added later if the hosting provider requires one.

## Request Correlation

Every production boundary should preserve or create an `X-Request-Id`.

- Trusted inbound request IDs may be reused when they match the expected safe format.
- Unsafe, oversized, or missing request IDs are replaced with a generated ID.
- Error responses should include the request ID so support can correlate user reports with server logs.

## Structured Logging

Operational logs are JSON lines with:

- `level`
- `event`
- `timestamp`
- optional `requestId`
- optional redacted `metadata`

Logs must pass through the shared redaction boundary before writing to the console.

The redactor recursively masks sensitive keys and common secret formats including:

- authorization headers
- cookies
- tokens
- passwords
- API keys
- private keys
- database URLs
- PostgreSQL connection strings

Do not log submitted form values, auth credentials, database URLs, provider tokens, secret hashes, cookies, or full request headers.

## Error Handling

Unexpected errors returned to users use generic messages. The response may include a request ID, but it must not include stack traces, SQL errors, connection details, provider responses, or secrets.

Expected product errors can return safe, user-facing messages such as validation failures, permission failures, or missing resources.

Platform API responses use `Cache-Control: no-store` because they are credentialed, tenant-scoped, and may include preview or staging data.

## Environment Validation

Run the production check before deploying:

```bash
pnpm production:check
```

The check validates that required production variables exist and are not obvious placeholders:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

The check reports only variable names and validation reasons. It must never print secret values.

## Security Headers

The dashboard applies conservative global headers:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: DENY`

A stricter Content Security Policy can be added once all production asset, analytics, and embedding needs are known.

## Database Failure Behavior

Application code should fail closed when the database is unavailable.

- Health returns `503`.
- APIs return safe generic failures for unexpected database errors.
- No API should expose SQL text, connection targets, credentials, stack traces, or migration state.
- Do not manually patch production schema to work around migration problems. Fix migrations and apply them through the release workflow.

## Backup Workflow

Before production migrations:

1. Confirm the target database hostname and database name through safe diagnostics.
2. Confirm a production backup policy has been chosen.
3. Confirm migrations have passed in staging.
4. Take or confirm a current provider-level backup or snapshot.
5. If repository backup commands are used, confirm PostgreSQL CLI tools are available.
6. Record backup timestamp, environment, and operator.
7. Run migrations only after the backup requirement is satisfied.
8. Verify health and critical read paths.
9. Keep the backup until the release is accepted.

Recovery from backup should be rehearsed in staging before V2 production launch.

See [V2 Backup, Recovery, and Disaster Readiness](V2_BACKUP_RECOVERY.md) for backup commands, restore guardrails, restore verification, migration status inspection, and emergency recovery workflow.

## Migration Workflow

Use this workflow for schema releases:

1. Generate migrations from schema changes.
2. Review SQL manually for tenant isolation, foreign keys, data backfills, enum casts, and destructive operations.
3. Run the transaction-based migration tester when pending migrations exist.
4. Run package typecheck, lint, and tests.
5. Backup production.
6. Run migrations against the intended production database.
7. Verify `drizzle.__drizzle_migrations`.
8. Verify `/api/health`.
9. Verify affected dashboard and Platform API flows.

Do not run real migrations from automated checks unless that is explicitly the release step.

## Platform API Operational Review

Platform API routes are credentialed and environment-scoped. They must:

- authenticate with website credentials
- derive organization, website, and environment identity from the credential
- return no-store responses
- return safe error messages
- avoid logging authorization headers or submission payloads
- preserve request IDs for support/debugging

## Form Submission Operational Review

Form submission payloads may contain private visitor data.

- Validate payload size before parsing.
- Validate field count and shape.
- Store normalized data only after tenant and module checks pass.
- Do not log submitted values on validation or persistence errors.
- Keep error responses generic unless the message is a safe validation message.

## Release Checklist

Before production deploy:

1. `pnpm production:check`
2. `pnpm --filter @agency/database typecheck`
3. `pnpm --filter @agency/database lint`
4. `pnpm --filter @agency/dashboard typecheck`
5. `pnpm --filter @agency/dashboard test`
6. `pnpm --filter @agency/dashboard lint`
7. Safe database target confirmed
8. Production backup policy chosen
9. Latest backup confirmed
10. Restore procedure understood by the operator
11. PostgreSQL tools available where repository backup commands are used
12. Database backup captured before real `db:migrate`
13. Migrations reviewed and applied
14. `/api/health` returns `200`

## Incident Notes

During an incident, capture:

- request ID
- timestamp
- affected route
- affected organization or website ID when safe
- observed status code
- high-level symptom

Do not copy credentials, auth headers, cookies, raw form submissions, or full database URLs into tickets.
