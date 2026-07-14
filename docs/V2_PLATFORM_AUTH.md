# V2 Platform Authentication Boundary

Sharoz Platform V2 separates human dashboard authentication from website machine authentication.

## Dashboard Authentication Boundary

Dashboard users authenticate through Better Auth.

Flow:

```text
Human user
-> Better Auth
-> Browser session
-> Organization membership
-> Capability permissions
-> Dashboard service
```

Dashboard sessions are browser sessions. They resolve users, memberships, active organization, and capability permissions such as `websites:manage` and `developer:credentials`.

## Website Machine Authentication Boundary

Sharoz Connected websites authenticate as machines using website API credentials.

Flow:

```text
Website server
-> Website API credential
-> Platform API authentication
-> Website principal
-> Module authorization
-> Module service
```

Website credentials never create Better Auth sessions. They are never treated as dashboard users.

## Example Future Architecture

```text
Custom Next.js Website Server
-> @sharoz/sdk
-> Platform API
-> Website Credential Authentication
-> Website Principal
-> Module Authorization
-> Module Service
```

## Why The Boundaries Are Separate

Dashboard authentication answers: “Which human is managing this client or website?”

Website authentication answers: “Which website server is calling the Platform API?”

Merging these models would create unsafe behavior, such as website servers receiving dashboard permissions or dashboard sessions becoming long-lived machine credentials.

## Credential Data Model

Website credentials live in `website_api_credentials`.

Fields:

- `id`
- `organization_id`
- `website_id`
- `label`
- `public_key`
- `secret_hash`
- `status`
- `expires_at`
- `last_used_at`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `revoked_at`

Credentials belong to exactly one organization and one website. The database enforces website/organization consistency with a composite foreign key.

## Credential Format

Public key:

```text
spk_<secure_random_value>
```

Secret:

```text
sps_<secure_random_value>
```

The public key identifies the credential. The secret proves possession.

## Secret Generation

Credential values are generated with Node.js cryptographic randomness. They do not use `Math.random`, timestamps, counters, or UUID-only secrets.

The plaintext secret is returned only at creation or rotation time.

## Secret Storage

The database stores only a one-way SHA-256 verifier for the high-entropy secret.

The plaintext secret is not stored. The platform cannot display an existing secret after creation or rotation.

## Verification Strategy

The verifier recomputes the hash for the supplied secret and compares it using timing-safe comparison.

Authentication failure is intentionally generic. External callers must not learn whether:

- the public key exists
- the secret was incorrect
- the credential was revoked
- the credential expired
- the website type is unsupported
- the organization/website relationship failed

## Website Principal

Successful machine authentication returns a trusted website principal:

- `organizationId`
- `websiteId`
- `credentialId`
- `credentialLabel`

The low-level verifier does not check module enablement. Module authorization belongs at the future Platform API/module boundary.

## Rotation Behavior

Rotation uses the safer audit model:

1. Revoke the old credential.
2. Create a new credential with a new public key and secret.
3. Return the new plaintext secret once.

The old secret no longer authenticates after rotation.

## Revocation Behavior

Revocation sets credential status to `revoked` and records `revoked_at`.

Revocation is idempotent. Revoked credentials immediately fail machine authentication.

## Expiration Behavior

Credentials may have a nullable expiration. Expired credentials fail authentication.

## Last-Used Tracking

Successful authentication updates `last_used_at`.

The update happens only after credential validation succeeds. This milestone does not add throttled or distributed last-used batching.

## Tenant Isolation

Credential management resolves the website first, then checks the dashboard caller's `developer:credentials` capability for that website's organization.

Machine authentication verifies:

- active credential
- valid secret
- non-expired credential
- non-revoked credential
- existing website
- matching `organization_id` and `website_id`
- website type is `sharoz_connected`

## Permission Model

The `developer:credentials` capability controls dashboard credential management.

Default behavior:

- Agency Owner: allowed.
- Agency Admin: allowed.
- Client Admin: not allowed by default.
- Editor: not allowed by default.
- Writer: not allowed by default.
- Viewer: not allowed by default.

Explicit permission overrides may grant the capability later through the existing permission system.

Machine credential authentication does not use dashboard membership permissions.

## Dashboard Developer Workflow

Each website has a Developer area.

Authorized users can:

- view safe credential metadata
- create credentials
- rotate credentials
- revoke credentials

On create or rotate, the dashboard displays the plaintext secret once with the warning:

```text
This secret will only be shown once.
```

The plaintext secret is not placed in URLs, cookies, local storage, or session storage.

## Security Rules

- Do not log plaintext secrets.
- Do not store plaintext secrets.
- Do not include plaintext secrets in audit metadata.
- Do not expose credential secrets to browser JavaScript outside the one-time dashboard response.
- Do not include website credentials in `NEXT_PUBLIC_*` environment variables.
- Do not let websites query the platform database directly.
- Do not use website credentials as dashboard sessions.

Website credentials are server credentials. They must never be included in browser JavaScript or exposed through `NEXT_PUBLIC_*` environment variables.

## Known Limitations

- Platform API routes are not implemented yet.
- `@sharoz/sdk` is not implemented yet.
- Module authorization is not implemented at an API boundary yet.
- Credential authentication failure events are not persisted to avoid unbounded audit spam.
- No rate limiting is attached to the future credential verifier yet.

## Future Platform API Integration

Future Platform API routes will authenticate website requests with the shared website credential verifier from `packages/auth`.

After authentication, routes will evaluate:

- website principal
- requested module
- module enablement
- module-specific permissions and validation

## Future `@sharoz/sdk` Integration

The future server-side SDK will accept website credentials through server-only configuration and send them to Platform API routes.

The SDK must not expose secrets to browser bundles.

Next milestone:

**V2 Milestone 4 — Platform API Foundation and @sharoz/sdk Authentication Client**
