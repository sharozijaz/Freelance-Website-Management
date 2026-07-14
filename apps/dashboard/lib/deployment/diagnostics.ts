import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";
import tls from "node:tls";
import { normalizeHostname } from "./domain-utils";

export const TLS_DIAGNOSTIC_TIMEOUT_MS = 5_000;
export const TLS_EXPIRY_WARNING_DAYS = 30;

export type DnsDiagnosticStatus = "error" | "resolved" | "unresolved";
export type TlsDiagnosticStatus = "error" | "expired" | "invalid" | "not_available" | "valid";

export interface DnsDiagnosticRecord {
  type: "A" | "AAAA" | "CNAME";
  value: string;
}

export interface DnsDiagnosticResult {
  checkedAt: string;
  hostname: string;
  records: DnsDiagnosticRecord[];
  status: DnsDiagnosticStatus;
  errors: { code: string; type: DnsDiagnosticRecord["type"] }[];
}

export interface TlsDiagnosticResult {
  authorizationError: string | null;
  authorized: boolean;
  checkedAt: string;
  daysUntilExpiry: number | null;
  expiresSoon: boolean;
  hostname: string;
  issuer: string | null;
  status: TlsDiagnosticStatus;
  subject: string | null;
  subjectAltNames: string[];
  validFrom: string | null;
  validTo: string | null;
}

export interface DomainDiagnosticResult {
  checkedAt: string;
  dns: DnsDiagnosticResult;
  hostname: string;
  tls: TlsDiagnosticResult;
}

export interface DnsResolver {
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
  resolveCname(hostname: string): Promise<string[]>;
}

export interface TlsInspector {
  inspect(hostname: string): Promise<TlsDiagnosticResult>;
}

const resolver = new Resolver();

export const nodeDnsResolver: DnsResolver = {
  resolve4: (hostname) => resolver.resolve4(hostname),
  resolve6: (hostname) => resolver.resolve6(hostname),
  resolveCname: (hostname) => resolver.resolveCname(hostname),
};

function safeHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (isIP(normalized) !== 0) {
    throw new Error("IP literals are not supported for domain diagnostics.");
  }
  return normalized;
}

function dnsErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "UNKNOWN";
}

function isUnresolvedDnsCode(code: string) {
  return code === "ENOTFOUND" || code === "ENODATA";
}

export async function inspectDns(
  hostname: string,
  dnsResolver: DnsResolver = nodeDnsResolver,
): Promise<DnsDiagnosticResult> {
  const normalized = safeHostname(hostname);
  const checkedAt = new Date().toISOString();
  const lookups = await Promise.allSettled([
    dnsResolver.resolve4(normalized),
    dnsResolver.resolve6(normalized),
    dnsResolver.resolveCname(normalized),
  ]);
  const recordTypes = ["A", "AAAA", "CNAME"] as const;
  const records: DnsDiagnosticRecord[] = [];
  const errors: DnsDiagnosticResult["errors"] = [];

  lookups.forEach((result, index) => {
    const type = recordTypes[index] ?? "A";
    if (result.status === "fulfilled") {
      records.push(...result.value.map((value) => ({ type, value })));
      return;
    }
    errors.push({ code: dnsErrorCode(result.reason), type });
  });

  const status =
    records.length > 0
      ? "resolved"
      : errors.every((error) => isUnresolvedDnsCode(error.code))
        ? "unresolved"
        : "error";

  return { checkedAt, errors, hostname: normalized, records, status };
}

function toText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseSubjectAltNames(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^DNS:/, ""))
    .slice(0, 25);
}

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function tlsStatus({
  authorized,
  authorizationError,
  validTo,
}: {
  authorized: boolean;
  authorizationError: string | null;
  validTo: string | null;
}): TlsDiagnosticStatus {
  if (!validTo) return "not_available";
  if (Number.isNaN(new Date(validTo).getTime())) return "not_available";
  if (new Date(validTo) <= new Date()) return "expired";
  if (!authorized) {
    return authorizationError === "CERT_HAS_EXPIRED" ? "expired" : "invalid";
  }
  return "valid";
}

export function projectPeerCertificate({
  authorized,
  authorizationError,
  certificate,
  hostname,
}: {
  authorized: boolean;
  authorizationError?: Error | string | null;
  certificate: tls.PeerCertificate | Record<string, unknown> | null | undefined;
  hostname: string;
}): TlsDiagnosticResult {
  const checkedAt = new Date().toISOString();
  const validFrom = toText(certificate?.valid_from);
  const validTo = toText(certificate?.valid_to);
  const days =
    validTo && !Number.isNaN(new Date(validTo).getTime()) ? daysUntil(new Date(validTo)) : null;
  const normalizedAuthorizationError =
    authorizationError instanceof Error
      ? authorizationError.message
      : typeof authorizationError === "string"
        ? authorizationError
        : null;

  return {
    authorizationError: normalizedAuthorizationError,
    authorized,
    checkedAt,
    daysUntilExpiry: days,
    expiresSoon: typeof days === "number" && days >= 0 && days <= TLS_EXPIRY_WARNING_DAYS,
    hostname,
    issuer:
      certificate && typeof certificate.issuer === "object"
        ? toText((certificate.issuer as Record<string, unknown>).CN)
        : null,
    status: tlsStatus({ authorized, authorizationError: normalizedAuthorizationError, validTo }),
    subject:
      certificate && typeof certificate.subject === "object"
        ? toText((certificate.subject as Record<string, unknown>).CN)
        : null,
    subjectAltNames: parseSubjectAltNames(toText(certificate?.subjectaltname) ?? undefined),
    validFrom,
    validTo,
  };
}

export const nodeTlsInspector: TlsInspector = {
  inspect: (hostname) =>
    new Promise((resolve) => {
      const normalized = safeHostname(hostname);
      let settled = false;
      const socket = tls.connect({
        host: normalized,
        port: 443,
        rejectUnauthorized: false,
        servername: normalized,
        timeout: TLS_DIAGNOSTIC_TIMEOUT_MS,
      });

      function finish(result: TlsDiagnosticResult) {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      }

      socket.once("secureConnect", () => {
        finish(
          projectPeerCertificate({
            authorized: socket.authorized,
            authorizationError: socket.authorizationError,
            certificate: socket.getPeerCertificate(false),
            hostname: normalized,
          }),
        );
      });

      socket.once("timeout", () => {
        finish({
          authorizationError: "TLS diagnostic timed out.",
          authorized: false,
          checkedAt: new Date().toISOString(),
          daysUntilExpiry: null,
          expiresSoon: false,
          hostname: normalized,
          issuer: null,
          status: "error",
          subject: null,
          subjectAltNames: [],
          validFrom: null,
          validTo: null,
        });
      });

      socket.once("error", (error: unknown) => {
        const message = error instanceof Error ? error.message : "TLS diagnostic failed.";
        finish({
          authorizationError: message,
          authorized: false,
          checkedAt: new Date().toISOString(),
          daysUntilExpiry: null,
          expiresSoon: false,
          hostname: normalized,
          issuer: null,
          status: "error",
          subject: null,
          subjectAltNames: [],
          validFrom: null,
          validTo: null,
        });
      });
    }),
};

export async function inspectDomainDiagnostics({
  dnsResolver = nodeDnsResolver,
  hostname,
  tlsInspector = nodeTlsInspector,
}: {
  dnsResolver?: DnsResolver;
  hostname: string;
  tlsInspector?: TlsInspector;
}): Promise<DomainDiagnosticResult> {
  const normalized = safeHostname(hostname);
  const [dns, tlsResult] = await Promise.allSettled([
    inspectDns(normalized, dnsResolver),
    tlsInspector.inspect(normalized),
  ]);

  const checkedAt = new Date().toISOString();
  const tls =
    tlsResult.status === "fulfilled"
      ? tlsResult.value
      : {
          authorizationError: "TLS diagnostic failed.",
          authorized: false,
          checkedAt,
          daysUntilExpiry: null,
          expiresSoon: false,
          hostname: normalized,
          issuer: null,
          status: "error" as const,
          subject: null,
          subjectAltNames: [],
          validFrom: null,
          validTo: null,
        };

  return {
    checkedAt,
    dns:
      dns.status === "fulfilled"
        ? dns.value
        : {
            checkedAt,
            errors: [{ code: "UNKNOWN", type: "A" }],
            hostname: normalized,
            records: [],
            status: "error" as const,
          },
    hostname: normalized,
    tls,
  };
}
