# V2 Backup, Recovery, and Disaster Readiness

This runbook defines backup and recovery operations for the Sharoz Agency Website Management V2 platform.

The application is not a database backup engine. It provides safe orchestration around standard PostgreSQL tools and documentation for provider-managed recovery.

## A. Backup Prerequisites

- Confirm the active `DATABASE_URL` target using safe metadata only.
- Confirm the database host, database name, and SSL expectation.
- Confirm PostgreSQL CLI tools are installed where repository backup commands run.
- Confirm `.backups/` is ignored by Git.
- Confirm the operator understands where the backup file will be stored.

Never print or paste full database URLs, passwords, API credentials, session secrets, preview tokens, staging secrets, or private form submission values into tickets or logs.

## B. Required PostgreSQL CLI Tools

Repository backup commands require:

- `pg_dump`
- `pg_restore`

Install these from the PostgreSQL client tools for the target operating system. The repository scripts fail loudly if the tools are unavailable.

## C. Local Backup Command

```bash
pnpm db:backup
```

The command:

- loads the root `.env`
- requires `DATABASE_URL`
- uses `pg_dump`
- writes a timestamped custom-format dump to `.backups/`
- creates `.backups/` if needed
- prints only safe database target metadata
- never prints the full database URL or password

Example filename pattern:

```text
agency-platform-20260714T120000Z.dump
```

## D. Production Backup Command Expectations

For production, prefer provider-managed backups first. Use repository `pg_dump` backups as an independent secondary backup, not as the only safety mechanism.

Before production `pnpm db:backup`:

1. Confirm you are connected to the intended production database.
2. Confirm disk space for the dump.
3. Store the resulting backup in approved secure storage outside the repository.
4. Record backup timestamp and operator.

## E. Provider-Managed Backups Versus Repository Scripts

Provider-managed backups are responsible for:

- automatic daily snapshots
- point-in-time recovery where available
- managed retention
- region/provider disaster recovery

Repository scripts are responsible for:

- explicit pre-migration dumps
- independent weekly PostgreSQL dumps
- local restore testing
- emergency portability between PostgreSQL-compatible providers

Do not fake provider backup status in the application.

## F. Verify a Backup

Check local backup metadata:

```bash
pnpm db:backup:status
```

This reports:

- whether `.backups/` exists
- count of local backup files
- latest backup timestamp
- latest backup size

A backup is not considered fully verified until it has been restored into a separate database and structurally checked.

## G. Safe Restore-To-New-Database Workflow

Create a new empty restore database first. Do not restore into the active application database.

Set a dedicated restore target:

```bash
RESTORE_DATABASE_URL=postgres://user:password@localhost:5432/agency_platform_restore
```

Restore with explicit confirmation:

```bash
SHAROZ_ALLOW_DATABASE_RESTORE=true pnpm db:restore -- .backups/agency-platform-20260714T120000Z.dump
```

The restore command refuses to run when:

- `RESTORE_DATABASE_URL` is missing
- `RESTORE_DATABASE_URL` targets the same host, port, and database as `DATABASE_URL`
- the backup file does not exist
- explicit restore confirmation is missing
- `pg_restore` is unavailable or fails

## H. Restore Verification

After restore:

```bash
pnpm db:verify-restore
```

This connects to `RESTORE_DATABASE_URL` and checks:

- connectivity
- Drizzle migration tracking table presence
- core table presence
- organizations
- websites
- website environments
- blog tables
- forms tables
- media assets
- deployments
- domains

It does not print rows, form submissions, credentials, hashes, or API secrets.

## I. Migration Status Inspection

Inspect migration status without mutation:

```bash
pnpm db:migration:status
```

This reports:

- database reachability
- whether the Drizzle migration table exists
- repository migration count
- database recorded migration count
- latest recorded migration hash

Drizzle stores migration hashes, not a perfect semantic reconciliation of local filenames to database state. If exact reconciliation is needed, inspect migration SQL and Drizzle metadata manually before applying migrations.

## J. Emergency Recovery Workflow

1. Stop or pause write traffic where possible.
2. Capture incident timestamp and request IDs.
3. Identify last known good backup or provider snapshot.
4. Restore into a separate database.
5. Run `pnpm db:verify-restore`.
6. Verify dashboard and Platform API read paths against the restored database.
7. Rotate credentials if compromise is suspected.
8. Promote the restored database only through the hosting/provider-approved cutover process.
9. Keep the damaged database isolated for forensic review if needed.

## K. Credential Rotation After Suspected Compromise

Rotate:

- database password
- Better Auth secret if session compromise is suspected
- Payload secret if CMS auth/session compromise is suspected
- website API credentials
- preview access tokens
- staging access secrets
- deployment provider tokens
- webhook secrets

Invalidate affected sessions and update connected websites after rotation.

## L. Connected Website Recovery Considerations

Connected websites depend on:

- Platform API base URL
- public key
- secret credential
- environment identity
- enabled modules
- published content

After restore, verify connected websites can read context, blog, media, and forms from the intended environment.

## M. Platform API Credential Considerations

Platform API credentials are environment-scoped. Recovery must preserve:

- organization scope
- website scope
- environment scope
- credential status
- revocation state

Never expose credential hashes or plaintext secrets in recovery notes.

## N. Preview/Staging Secret Considerations

Preview tokens and staging access secrets may need rotation after recovery, especially when the incident includes environment leakage, logs, or unauthorized access.

## O. Domain and DNS Recovery Considerations

Domain records and DNS state are operational metadata. After restore:

- verify primary domain assignment
- rerun DNS/TLS diagnostics
- confirm SSL state
- confirm deployment provider domain mapping
- avoid changing DNS until the restored deployment target is confirmed

## P. Deployment Record Considerations

Deployment records are operational evidence. Preserve them during incident review where possible. After restore, verify deployment status and provider IDs before launching or relaunching a site.

## Q. Form Submission Privacy Considerations

Form submissions can contain private visitor data.

- Do not print submission row contents during verification.
- Do not copy submissions into support tickets.
- Treat backup files as sensitive because they may contain form submissions.
- Store backups only in approved secure locations.

## R. What Must Never Be Committed To Git

Never commit:

- `.backups/`
- `.dump` database backups
- `.env` files
- database URLs
- API credentials
- staging secrets
- preview tokens
- session secrets
- private form exports

## S. Recommended Backup Schedule

Baseline before V2 production launch:

- daily provider-managed production backup
- weekly independent PostgreSQL custom-format dump
- pre-migration backup
- pre-major-release backup
- monthly restore test into a separate database

A backup is not considered verified until restore has been tested.
