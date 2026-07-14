# V2 Environment Security UI

V2 Milestone 8 adds dashboard controls for connected website environment security.

## Dashboard Controls

Environment security controls live on:

```text
/websites/[websiteId]/environments
```

The dashboard shows each environment with operational details and a separate security area.

For staging environments, operators can inspect:

- preview access status
- preview token last rotation time
- staging access protection status
- staging secret configuration status
- staging secret last rotation time

Production environments do not expose staging-only controls.

## Preview Token Rotation

Preview access is human/browser authorization for seeing draft content on a connected staging site.

When an operator rotates a preview token:

1. the dashboard requires confirmation
2. the server calls the existing environment security service
3. the old preview token becomes invalid
4. the new plaintext token is returned once
5. the dashboard displays the value in a one-time panel

After dismissal or navigation, only configured status and last rotation time remain visible.

## Staging Access Protection

Staging access protection is separate from Blog preview authorization.

When enabling staging access protection, the dashboard generates/rotates a staging access secret as part of the enablement workflow. This avoids enabling staging protection without a usable secret.

When disabling staging access protection, the dashboard confirms that the staging site will no longer require staging access authorization. Preview authorization remains separate.

## Staging Secret Rotation

Rotating the staging secret invalidates the previous staging access secret. Visitors or deployments using the old secret may lose access until updated.

The new plaintext secret is shown exactly once.

## One-Time Secret Display Rule

Plaintext preview tokens and staging secrets are never stored in the database, cookies, local storage, session storage, URLs, audit metadata, analytics events, or logs.

The dashboard receives plaintext only in the immediate mutation response and stores it only in transient React state for the one-time display panel.

There is no reveal-existing-secret feature. Rotation is the recovery mechanism.

## Connected Deployment Setup

The connected example app uses these server-side environment variable names:

```text
SHAROZ_PREVIEW_ACCESS_TOKEN_HASH
SHAROZ_PREVIEW_ACCESS_TOKEN
SHAROZ_STAGING_ACCESS_ENABLED
SHAROZ_STAGING_ACCESS_SECRET_HASH
SHAROZ_STAGING_ACCESS_SECRET
```

Preview flow:

1. a user visits `/preview` with the preview token
2. the connected server validates the token
3. an HttpOnly preview cookie is established
4. server-side SDK requests send preview intent
5. Platform API environment identity still comes from the API credential

Staging access flow:

1. a user visits `/staging-access` with the staging access token
2. the connected server validates the token
3. an HttpOnly staging access cookie is established
4. connected middleware protects staging routes when enabled

Never configure these values as `NEXT_PUBLIC_*`.

## Audit Behavior

Security actions write safe audit events:

- `website_environment.preview_access_rotated`
- `website_environment.staging_access_enabled`
- `website_environment.staging_access_disabled`
- `website_environment.staging_secret_rotated`

Audit metadata may include website ID, environment ID, environment type, enabled state, and whether a secret was rotated.

Audit metadata must never include plaintext tokens, plaintext secrets, secret hashes, or API credentials.

## Environment Scoping

All mutations validate:

- authenticated dashboard session
- organization membership and permission
- website ownership/scope
- environment ownership/scope
- staging-only behavior where required

The UI is not the security boundary. Server services enforce scope and environment type.

## Known Limitations

The dashboard provides copy-safe instructions and one-time secrets, but it does not automatically deploy environment variables to hosting providers. Deployment automation remains a later milestone.
