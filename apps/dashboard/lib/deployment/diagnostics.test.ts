import { describe, expect, it } from "vitest";
import {
  inspectDns,
  inspectDomainDiagnostics,
  projectPeerCertificate,
  TLS_EXPIRY_WARNING_DAYS,
  type DnsResolver,
  type TlsInspector,
} from "./diagnostics";

function dnsError(code: string) {
  return Object.assign(new Error(code), { code });
}

function resolver({
  a = [],
  aaaa = [],
  cname = [],
  errorCode,
}: {
  a?: string[];
  aaaa?: string[];
  cname?: string[];
  errorCode?: string;
}): DnsResolver {
  return {
    resolve4: () => (errorCode ? Promise.reject(dnsError(errorCode)) : Promise.resolve(a)),
    resolve6: () => (errorCode ? Promise.reject(dnsError(errorCode)) : Promise.resolve(aaaa)),
    resolveCname: () => (errorCode ? Promise.reject(dnsError(errorCode)) : Promise.resolve(cname)),
  };
}

function tlsResult(overrides: Partial<Awaited<ReturnType<TlsInspector["inspect"]>>> = {}) {
  return {
    authorizationError: null,
    authorized: true,
    checkedAt: new Date().toISOString(),
    daysUntilExpiry: 90,
    expiresSoon: false,
    hostname: "www.example.com",
    issuer: "Example CA",
    status: "valid" as const,
    subject: "www.example.com",
    subjectAltNames: ["www.example.com"],
    validFrom: "Jan 01 00:00:00 2026 GMT",
    validTo: "Dec 31 23:59:59 2026 GMT",
    ...overrides,
  };
}

describe("domain diagnostics", () => {
  it("projects resolved A, AAAA, and CNAME records", async () => {
    const result = await inspectDns(
      "https://www.example.com/path",
      resolver({
        a: ["203.0.113.10"],
        aaaa: ["2001:db8::1"],
        cname: ["target.example.com"],
      }),
    );

    expect(result).toMatchObject({
      hostname: "www.example.com",
      status: "resolved",
    });
    expect(result.records).toEqual([
      { type: "A", value: "203.0.113.10" },
      { type: "AAAA", value: "2001:db8::1" },
      { type: "CNAME", value: "target.example.com" },
    ]);
  });

  it("returns unresolved for not found DNS responses", async () => {
    await expect(
      inspectDns("www.example.com", resolver({ errorCode: "ENOTFOUND" })),
    ).resolves.toMatchObject({
      records: [],
      status: "unresolved",
    });
  });

  it("returns error for resolver failures without throwing", async () => {
    await expect(
      inspectDns("www.example.com", resolver({ errorCode: "SERVFAIL" })),
    ).resolves.toMatchObject({
      records: [],
      status: "error",
    });
  });

  it("rejects unsafe diagnostic hostnames", async () => {
    await expect(inspectDns("https://user:pass@example.com", resolver({}))).rejects.toThrow();
    await expect(inspectDns("https://example.com:8443", resolver({}))).rejects.toThrow();
    await expect(inspectDns("127.0.0.10", resolver({}))).rejects.toThrow();
    await expect(inspectDns("*.example.com", resolver({}))).rejects.toThrow();
  });

  it("projects safe TLS certificate metadata", () => {
    const result = projectPeerCertificate({
      authorized: true,
      certificate: {
        issuer: { CN: "Example CA" },
        raw: Buffer.from("raw certificate data"),
        subject: { CN: "www.example.com" },
        subjectaltname: "DNS:www.example.com, DNS:example.com",
        valid_from: "Jan 01 00:00:00 2026 GMT",
        valid_to: "Dec 31 23:59:59 2026 GMT",
      },
      hostname: "www.example.com",
    });

    expect(result).toMatchObject({
      authorized: true,
      issuer: "Example CA",
      status: "valid",
      subject: "www.example.com",
      subjectAltNames: ["www.example.com", "example.com"],
    });
    expect(JSON.stringify(result)).not.toContain("raw certificate data");
  });

  it("classifies expired, hostname mismatch, and untrusted TLS results", () => {
    const expired = projectPeerCertificate({
      authorized: false,
      authorizationError: "CERT_HAS_EXPIRED",
      certificate: { valid_to: "Jan 01 00:00:00 2020 GMT" },
      hostname: "www.example.com",
    });
    const mismatch = projectPeerCertificate({
      authorized: false,
      authorizationError: "Hostname/IP does not match certificate's altnames",
      certificate: { valid_to: "Dec 31 23:59:59 2026 GMT" },
      hostname: "www.example.com",
    });
    const selfSigned = projectPeerCertificate({
      authorized: false,
      authorizationError: "DEPTH_ZERO_SELF_SIGNED_CERT",
      certificate: { valid_to: "Dec 31 23:59:59 2026 GMT" },
      hostname: "www.example.com",
    });

    expect(expired.status).toBe("expired");
    expect(mismatch.status).toBe("invalid");
    expect(selfSigned.status).toBe("invalid");
  });

  it("flags certificates expiring within the warning threshold", () => {
    const validTo = new Date(Date.now() + (TLS_EXPIRY_WARNING_DAYS - 1) * 86_400_000);
    const result = projectPeerCertificate({
      authorized: true,
      certificate: { valid_to: validTo.toUTCString() },
      hostname: "www.example.com",
    });

    expect(result.expiresSoon).toBe(true);
    expect(result.status).toBe("valid");
  });

  it("combines DNS and TLS diagnostics and handles TLS errors", async () => {
    const tlsInspector: TlsInspector = {
      inspect: () => Promise.resolve(tlsResult({ status: "error", authorizationError: "timeout" })),
    };
    const result = await inspectDomainDiagnostics({
      dnsResolver: resolver({ a: ["203.0.113.10"] }),
      hostname: "www.example.com",
      tlsInspector,
    });

    expect(result.dns.status).toBe("resolved");
    expect(result.tls.status).toBe("error");
    expect(result.hostname).toBe("www.example.com");
  });
});
