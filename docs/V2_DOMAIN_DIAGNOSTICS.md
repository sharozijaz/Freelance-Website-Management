# V2 Domain Diagnostics

This document describes the V2 DNS, TLS, and production diagnostic layer for the Sharoz Agency Website Management Platform.

## Architecture Decision

Domain diagnostics extend the existing domain/deployment service architecture. They do not create a duplicate domain subsystem.

The platform remains:

- not a DNS provider
- not a registrar
- not a certificate authority
- not a hosting automation platform

Diagnostics are observations of the current public network state. They are not ownership verification and do not silently overwrite operator-controlled launch state.

## Manual State vs Observed Diagnostics

Manual operational fields remain:

- `domains.dnsState`
- `domains.sslState`

These are controlled by dashboard operators and remain part of launch approval.

Observed diagnostics are returned on demand:

- DNS diagnostic result
- TLS diagnostic result
- checked timestamp
- safe projected DNS records
- safe projected certificate metadata

Observed diagnostics are additional evidence. They do not automatically mark DNS as valid or SSL as issued.

## DNS Inspection Model

DNS diagnostics use server-side Node DNS APIs through `node:dns/promises`.

Supported record types:

- A
- AAAA
- CNAME

The diagnostic service loads the domain from the database by ID and uses the stored normalized hostname. It does not accept arbitrary browser-provided hostnames, DNS servers, resolver configuration, or query types.

DNS statuses:

- `resolved`
- `unresolved`
- `error`

Safe DNS record shape:

```ts
{
  type: "A" | "AAAA" | "CNAME";
  value: string;
}
```

Common DNS failures such as `ENOTFOUND`, `ENODATA`, `ETIMEOUT`, and `SERVFAIL` are handled without crashing dashboard requests.

## TLS Inspection Model

TLS diagnostics use server-side Node TLS APIs through `node:tls`.

The diagnostic service connects only to:

- stored normalized hostname
- port `443`
- SNI set to the stored hostname

It does not accept arbitrary ports, protocols, redirects, or browser-provided hostnames.

TLS statuses:

- `valid`
- `invalid`
- `expired`
- `not_available`
- `error`

Safe TLS projection includes:

- hostname
- checked timestamp
- authorized
- authorization error
- valid from
- valid to
- days until expiry
- subject common name
- issuer common name
- subject alternative names

It never returns raw certificate buffers, socket internals, session data, or private material.

## Network Safety Boundaries

Diagnostics validate hostnames using the same canonical domain normalization rules used by domain management.

Rejected values include:

- localhost
- IP literals
- wildcard hostnames
- credentials
- ports
- paths
- query strings
- fragments
- malformed hostnames

TLS diagnostics use an explicit timeout and always destroy sockets after completion, timeout, or error.

## Tenant Scope

Diagnostic operations validate:

- authenticated dashboard context
- organization permission
- website ownership
- domain ownership
- domain environment scope

The API route is website/domain scoped:

```txt
/api/websites/[websiteId]/domains/[domainId]/diagnostics
```

It ignores browser-provided organization IDs and never exposes diagnostics through the public Platform API.

## Diagnostic DTO Shapes

Combined diagnostics return:

```ts
{
  hostname: string;
  checkedAt: string;
  dns: DnsDiagnosticResult;
  tls: TlsDiagnosticResult;
}
```

DTOs are safe projections only. They do not include raw DNS resolver payloads, raw peer certificates, credentials, tokens, or provider secrets.

## Certificate Expiry Threshold

Certificate expiry warnings use:

```ts
TLS_EXPIRY_WARNING_DAYS = 30;
```

Expired certificates are classified as `expired`. Certificates expiring within the threshold are still `valid` when authorized, but expose `expiresSoon = true` and appear as readiness warnings.

## Launch Readiness Integration

Launch readiness keeps manual DNS and SSL states as approval gates.

Observed diagnostics are added as evidence:

- unresolved DNS: warning
- DNS error: warning
- TLS unavailable: warning
- TLS invalid: warning
- TLS expired: warning
- TLS expiring soon: warning
- valid DNS/TLS: pass

This avoids making local development, staging, or temporary DNS propagation workflows impossible while still giving operators useful production evidence.

## Error Handling

Diagnostic errors are converted into safe statuses and short messages.

The dashboard should show:

- DNS resolved/unresolved/error
- TLS valid/invalid/expired/not available/error

The dashboard should not show stack traces, raw resolver errors, socket internals, raw certificate objects, or provider secrets.

## Audit Decision

Diagnostics are operational reads and are intentionally not audited on every successful check to avoid audit noise.

Manual operational changes still produce audit events:

- `domain.dns_status_updated`
- `domain.ssl_status_updated`

If future diagnostics become security-sensitive workflows, audit only significant operator/security events and never log raw certificates, raw DNS payloads, credentials, tokens, authorization headers, database URLs, or provider secrets.

## Known Limitations

- Diagnostics do not verify domain ownership.
- Diagnostics do not configure DNS.
- Diagnostics do not request or renew certificates.
- Diagnostics do not validate provider-specific target records unless expected target data is modeled later.
- DNS and TLS checks depend on public network state at the time of inspection.
