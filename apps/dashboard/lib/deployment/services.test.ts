import { describe, expect, it } from "vitest";
import { auditLogs, deployments, domains, websites } from "@agency/database/schema";
import type { MembershipRole } from "@agency/auth";
import {
  addWebsiteDomain,
  getWebsiteLaunchReadiness,
  inspectDomainDiagnostics,
  normalizeFailureSummary,
  normalizeHostname,
  normalizeProductionUrl,
  recordWebsiteLaunch,
  recordManualDeployment,
  removeWebsiteDomain,
  setPrimaryDomain,
  updateDomainOperationalStatus,
  updateDeploymentStatus,
} from "./services";
import type { DnsResolver, TlsInspector } from "./diagnostics";
import type { DashboardRequest } from "@/lib/dashboard/types";

function createRequest({
  permissions = [
    "websites:read",
    "websites:manage",
    "deployments:read",
    "deployments:trigger",
    "domains:read",
    "domains:manage",
    "hosting:manage",
  ],
  role = "client_admin",
}: {
  permissions?: string[];
  role?: MembershipRole;
} = {}): DashboardRequest {
  return {
    access: {
      activeOrganizationId: "org_a",
      canManageMembers: true,
      canReadAudit: true,
      canReadContent: true,
      canReadWebsites: true,
      canWriteContent: true,
      isAgencyUser: false,
      role,
      workspaceMode: "client",
    },
    context: {
      activeOrganizationId: "org_a",
      memberships: [
        {
          organizationId: "org_a",
          permissions,
          role,
          status: "active",
          userId: "user_a",
        },
      ],
      session: {
        activeOrganizationId: "org_a",
        expiresAt: new Date(Date.now() + 60_000),
        id: "session_a",
        userId: "user_a",
      },
      user: {
        email: "operator@example.com",
        emailVerified: true,
        id: "user_a",
        image: null,
        name: "Operator",
      },
    },
  };
}

function createDatabase({
  deploymentStatus = "queued",
  environmentWebsiteId = "website_a",
}: {
  deploymentStatus?: "cancelled" | "deploying" | "failed" | "queued" | "ready";
  environmentWebsiteId?: string;
} = {}) {
  const website = {
    deletedAt: null,
    deploymentStatus: "queued",
    id: "website_a",
    organization: { id: "org_a", name: "Org A" },
    organizationId: "org_a",
    productionUrl: "https://www.example.com",
    projects: [],
    websiteType: "sharoz_connected" as const,
  };
  const environment = {
    id: "environment_production",
    name: "Production",
    organizationId: "org_a",
    type: "production" as const,
    websiteId: environmentWebsiteId,
  };
  const connection = {
    configuration: { productionUrl: "https://www.example.com" },
    id: "connection_manual",
    productionUrl: "https://www.example.com",
    provider: "manual" as const,
  };
  const state = {
    audits: [] as Record<string, unknown>[],
    deployments: [
      {
        completedAt: null,
        deploymentUrl: "https://www.example.com",
        environment,
        failureSummary: null,
        id: "deployment_a",
        metadata: { triggerType: "manual" },
        notes: null,
        organizationId: "org_a",
        provider: "manual",
        providerConnection: connection,
        providerConnectionId: "connection_manual",
        startedAt: null,
        status: deploymentStatus,
        triggeredBy: null,
        website,
        websiteEnvironmentId: environment.id,
        websiteId: website.id,
      },
    ] as Record<string, unknown>[],
  };

  const database = {
    insert: (table: unknown) => ({
      values(value: Record<string, unknown>) {
        if (table === deployments) {
          const row = {
            completedAt: null,
            createdAt: new Date("2026-07-13T00:00:00.000Z"),
            environment,
            id: "deployment_new",
            triggeredBy: { email: "operator@example.com" },
            website,
            ...value,
          };
          state.deployments.push(row);
          return { returning: () => Promise.resolve([row]) };
        }
        if (table === auditLogs) state.audits.push(value);
        return { returning: () => Promise.resolve([value]) };
      },
    }),
    query: {
      deployments: {
        findFirst: () =>
          Promise.resolve({
            ...state.deployments[0],
            environment,
            organization: { id: "org_a", name: "Org A" },
            providerConnection: connection,
            website,
          }),
      },
      hostingProviderConnections: {
        findFirst: () => Promise.resolve(connection),
      },
      websiteEnvironments: {
        findFirst: () => Promise.resolve(environmentWebsiteId === website.id ? environment : null),
      },
      websites: {
        findFirst: () => Promise.resolve(website),
      },
    },
    transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback(database),
    update: (table: unknown) => ({
      set(value: Record<string, unknown>) {
        return {
          where: () => ({
            returning: () => {
              if (table === deployments) {
                state.deployments[0] = { ...state.deployments[0], ...value };
                return Promise.resolve([state.deployments[0]]);
              }
              if (table === websites) {
                Object.assign(website, value);
              }
              return Promise.resolve([value]);
            },
          }),
        };
      },
    }),
  };

  return { database: database as never, state };
}

describe("deployment services", () => {
  it("normalizes safe hostnames", () => {
    expect(normalizeHostname("HTTPS://WWW.Example.COM/about")).toBe("www.example.com");
    expect(normalizeHostname("client-site.co")).toBe("client-site.co");
    expect(normalizeHostname(" EXAMPLE.com. ")).toBe("example.com");
    expect(normalizeHostname("https://bücher.example/")).toBe("xn--bcher-kva.example");
  });

  it("rejects unsafe or ambiguous hostnames", () => {
    expect(() => normalizeHostname("localhost:3000")).toThrow();
    expect(() => normalizeHostname("https://example.com?x=1")).toThrow();
    expect(() => normalizeHostname("not a domain")).toThrow();
    expect(() => normalizeHostname("https://user:pass@example.com")).toThrow();
    expect(() => normalizeHostname("*.example.com")).toThrow();
  });

  it("normalizes production origins", () => {
    expect(normalizeProductionUrl("example.com/path?x=1")).toBe("https://example.com");
    expect(normalizeProductionUrl("https://www.example.com/landing")).toBe(
      "https://www.example.com",
    );
  });

  it("redacts sensitive deployment failure summaries", () => {
    expect(
      normalizeFailureSummary(
        "DATABASE_URL=postgres://secret Authorization: Bearer abc token=123 API_KEY=456",
      ),
    ).toContain("[redacted]");
  });

  it("records manual deployments with scoped environment and safe audit metadata", async () => {
    const { database, state } = createDatabase();

    const deployment = await recordManualDeployment({
      database,
      input: {
        commitSha: "abcdef1",
        deploymentUrl: "https://www.example.com/release",
        environmentId: "environment_production",
        notes: "Operator note",
        sourceReference: "main",
        status: "queued",
      },
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(deployment).toMatchObject({
      metadata: { commitSha: "abcdef1", sourceReference: "main", triggerType: "manual" },
      status: "queued",
      websiteEnvironmentId: "environment_production",
    });
    expect(JSON.stringify(state.audits)).not.toContain("Operator note");
  });

  it("rejects manual deployments for environments outside the website scope", async () => {
    await expect(
      recordManualDeployment({
        database: createDatabase({ environmentWebsiteId: "website_b" }).database,
        input: { environmentId: "environment_production", status: "queued" },
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Website environment was not found.");
  });

  it("allows valid lifecycle transitions and blocks terminal changes", async () => {
    const queued = createDatabase({ deploymentStatus: "queued" });
    await expect(
      updateDeploymentStatus({
        database: queued.database,
        deploymentId: "deployment_a",
        request: createRequest(),
        status: "deploying",
        websiteId: "website_a",
      }),
    ).resolves.toMatchObject({ status: "deploying" });

    const deploying = createDatabase({ deploymentStatus: "deploying" });
    await expect(
      updateDeploymentStatus({
        database: deploying.database,
        deploymentId: "deployment_a",
        failureSummary: "token=abc failed",
        request: createRequest(),
        status: "failed",
        websiteId: "website_a",
      }),
    ).resolves.toMatchObject({ failureSummary: "token=[redacted] failed", status: "failed" });

    await expect(
      updateDeploymentStatus({
        database: createDatabase({ deploymentStatus: "ready" }).database,
        deploymentId: "deployment_a",
        request: createRequest(),
        status: "deploying",
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Terminal deployments cannot be changed.");
  });
});

function createDomainLaunchDatabase({
  credential = true,
  deploymentStatus = "ready",
  domainDnsState = "valid",
  domainIsPrimary = true,
  domainSslState = "issued",
  domainWebsiteId = "website_a",
  launchedAt = null,
  selectedDomain = "production",
  websiteType = "sharoz_connected",
}: {
  credential?: boolean;
  deploymentStatus?: string;
  domainDnsState?: string;
  domainIsPrimary?: boolean;
  domainSslState?: string;
  domainWebsiteId?: string;
  launchedAt?: Date | null;
  selectedDomain?: "production" | "staging";
  websiteType?: "external_legacy" | "sharoz_connected" | "wordpress";
} = {}) {
  const website = {
    deletedAt: null,
    deploymentStatus: "ready",
    id: "website_a",
    launchedAt,
    organization: { id: "org_a", name: "Org A" },
    organizationId: "org_a",
    primaryDomain: domainIsPrimary ? "www.example.com" : null,
    productionUrl: domainIsPrimary ? "https://www.example.com" : null,
    projects: [],
    status: "draft",
    websiteType,
  };
  const productionEnvironment = {
    id: "environment_production",
    name: "Production",
    organizationId: "org_a",
    status: "active",
    type: "production" as const,
    websiteId: "website_a",
  };
  const stagingEnvironment = {
    id: "environment_staging",
    name: "Staging",
    organizationId: "org_a",
    status: "active",
    type: "staging" as const,
    websiteId: "website_a",
  };
  const productionDomain = {
    createdAt: new Date("2026-07-14T00:00:00.000Z"),
    deletedAt: null,
    dnsState: domainDnsState,
    domain: "www.example.com",
    environment: productionEnvironment,
    id: "domain_production",
    isPrimary: domainIsPrimary,
    lastCheckedAt: null,
    organizationId: "org_a",
    providerConnection: null,
    requiredDnsRecords: [],
    sslState: domainSslState,
    verificationStatus: "pending",
    website,
    websiteEnvironmentId: productionEnvironment.id,
    websiteId: domainWebsiteId,
  };
  const stagingDomain = {
    ...productionDomain,
    dnsState: "valid",
    domain: "staging.example.com",
    environment: stagingEnvironment,
    id: "domain_staging",
    isPrimary: false,
    sslState: "issued",
    websiteEnvironmentId: stagingEnvironment.id,
    websiteId: "website_a",
  };
  const deployment = {
    createdAt: new Date("2026-07-14T00:00:00.000Z"),
    environment: productionEnvironment,
    id: "deployment_production",
    organizationId: "org_a",
    status: deploymentStatus,
    websiteEnvironmentId: productionEnvironment.id,
    websiteId: "website_a",
  };
  const state = {
    audits: [] as Record<string, unknown>[],
    domains: [productionDomain, stagingDomain] as Record<string, unknown>[],
    website,
  };

  const database = {
    insert: (table: unknown) => ({
      values(value: Record<string, unknown>) {
        if (table === auditLogs) state.audits.push(value);
        return { returning: () => Promise.resolve([value]) };
      },
    }),
    query: {
      deployments: {
        findFirst: () => Promise.resolve(deploymentStatus ? deployment : null),
      },
      domains: {
        findFirst: () =>
          Promise.resolve(
            domainWebsiteId === "website_a"
              ? {
                  ...(selectedDomain === "staging" ? stagingDomain : productionDomain),
                  website: state.website,
                }
              : {
                  ...productionDomain,
                  website: state.website,
                  websiteId: domainWebsiteId,
                },
          ),
        findMany: () =>
          Promise.resolve(
            state.domains.filter(
              (domain) =>
                domain.websiteId === "website_a" &&
                domain.websiteEnvironmentId === productionEnvironment.id &&
                !domain.deletedAt,
            ),
          ),
      },
      websiteApiCredentials: {
        findFirst: () => Promise.resolve(credential ? { id: "credential_a" } : null),
      },
      websiteEnvironments: {
        findFirst: () => Promise.resolve(productionEnvironment),
        findMany: () => Promise.resolve([productionEnvironment, stagingEnvironment]),
      },
      websiteModules: {
        findMany: () => Promise.resolve([{ moduleKey: "blog" }]),
      },
      websites: {
        findFirst: () => Promise.resolve(state.website),
      },
    },
    transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback(database),
    update: (table: unknown) => ({
      set(value: Record<string, unknown>) {
        function applyUpdate() {
          if (table === domains) {
            if (value.deletedAt) {
              Object.assign(productionDomain, value);
              return productionDomain;
            }
            if (value.isPrimary === false) {
              state.domains.forEach((domain) => Object.assign(domain, { isPrimary: false }));
            } else {
              Object.assign(productionDomain, value);
            }
            if (value.dnsState || value.sslState) Object.assign(productionDomain, value);
            return productionDomain;
          }
          if (table === websites) {
            Object.assign(state.website, value);
            return state.website;
          }
          return value;
        }

        return {
          where: () => ({
            returning: () => Promise.resolve([applyUpdate()]),
            then: (resolve: (value: unknown) => void) => {
              resolve(applyUpdate());
            },
          }),
        };
      },
    }),
  };

  return { database: database as never, productionDomain, stagingDomain, state };
}

describe("domain and launch operations", () => {
  it("detects domain conflicts before creating a new assignment", async () => {
    await expect(
      addWebsiteDomain({
        database: createDomainLaunchDatabase().database,
        domain: "https://www.example.com/",
        environmentId: "environment_production",
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("This domain is already connected to a website.");
  });

  it("sets only production domains as primary and synchronizes the website summary", async () => {
    const { database, state } = createDomainLaunchDatabase({ domainIsPrimary: false });

    await expect(
      setPrimaryDomain({ database, domainId: "domain_production", request: createRequest() }),
    ).resolves.toMatchObject({ domain: "www.example.com", isPrimary: true });
    expect(state.website.primaryDomain).toBe("www.example.com");
    expect(state.website.productionUrl).toBe("https://www.example.com");
    expect(JSON.stringify(state.audits)).toContain("domain.primary_changed");
  });

  it("rejects staging domains as primary production domains", async () => {
    await expect(
      setPrimaryDomain({
        database: createDomainLaunchDatabase({ selectedDomain: "staging" }).database,
        domainId: "domain_staging",
        request: createRequest(),
      }),
    ).rejects.toThrow("Only production domains can be set as primary.");
  });

  it("rejects cross-site domain access through environment scope validation", async () => {
    await expect(
      removeWebsiteDomain({
        database: createDomainLaunchDatabase({ domainWebsiteId: "website_b" }).database,
        domainId: "domain_production",
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Domain environment scope is invalid.");
  });

  it("protects primary domains from removal", async () => {
    await expect(
      removeWebsiteDomain({
        database: createDomainLaunchDatabase().database,
        domainId: "domain_production",
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Primary production domains must be changed before removal.");
  });

  it("records manual DNS and SSL status without unsafe audit metadata", async () => {
    const { database, state } = createDomainLaunchDatabase({
      domainDnsState: "pending",
      domainSslState: "pending",
    });

    await updateDomainOperationalStatus({
      database,
      dnsState: "valid",
      domainId: "domain_production",
      request: createRequest(),
      sslState: "issued",
      websiteId: "website_a",
    });

    expect(state.audits.map((audit) => audit.action)).toEqual([
      "domain.dns_status_updated",
      "domain.ssl_status_updated",
    ]);
    expect(JSON.stringify(state.audits)).not.toContain("certificate");
  });

  it("runs diagnostics against the stored hostname instead of browser input", async () => {
    const queried: string[] = [];
    const dnsResolver: DnsResolver = {
      resolve4: (hostname) => {
        queried.push(hostname);
        return Promise.resolve(["203.0.113.10"]);
      },
      resolve6: () => Promise.resolve([]),
      resolveCname: () => Promise.resolve([]),
    };
    const tlsInspector: TlsInspector = {
      inspect: (hostname) =>
        Promise.resolve({
          authorizationError: null,
          authorized: true,
          checkedAt: new Date().toISOString(),
          daysUntilExpiry: 90,
          expiresSoon: false,
          hostname,
          issuer: "Example CA",
          status: "valid",
          subject: hostname,
          subjectAltNames: [hostname],
          validFrom: "Jan 01 00:00:00 2026 GMT",
          validTo: "Dec 31 23:59:59 2026 GMT",
        }),
    };

    const diagnostics = await inspectDomainDiagnostics({
      database: createDomainLaunchDatabase().database,
      dependencies: { dnsResolver, tlsInspector },
      domainId: "domain_production",
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(queried).toEqual(["www.example.com"]);
    expect(diagnostics.hostname).toBe("www.example.com");
  });

  it("returns launch blockers for missing production readiness", async () => {
    const readiness = await getWebsiteLaunchReadiness({
      database: createDomainLaunchDatabase({
        credential: false,
        deploymentStatus: "failed",
        domainDnsState: "pending",
        domainSslState: "pending",
      }).database,
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(readiness.blockers.map((item) => item.key)).toEqual(
      expect.arrayContaining(["production_deployment", "dns", "ssl", "production_credential"]),
    );
  });

  it("adds launch readiness warnings from observed diagnostics without replacing manual gates", async () => {
    const dnsResolver: DnsResolver = {
      resolve4: () => Promise.reject(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" })),
      resolve6: () => Promise.reject(Object.assign(new Error("ENODATA"), { code: "ENODATA" })),
      resolveCname: () => Promise.reject(Object.assign(new Error("ENODATA"), { code: "ENODATA" })),
    };
    const tlsInspector: TlsInspector = {
      inspect: (hostname) =>
        Promise.resolve({
          authorizationError: "CERT_HAS_EXPIRED",
          authorized: false,
          checkedAt: new Date().toISOString(),
          daysUntilExpiry: -1,
          expiresSoon: false,
          hostname,
          issuer: null,
          status: "expired",
          subject: null,
          subjectAltNames: [],
          validFrom: null,
          validTo: new Date(Date.now() - 86_400_000).toUTCString(),
        }),
    };

    const readiness = await getWebsiteLaunchReadiness({
      database: createDomainLaunchDatabase().database,
      diagnosticDependencies: { dnsResolver, tlsInspector },
      diagnostics: true,
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(readiness.blockers.map((item) => item.key)).not.toContain("observed_dns");
    expect(readiness.warnings.map((item) => item.key)).toEqual(
      expect.arrayContaining(["observed_dns", "observed_tls"]),
    );
  });

  it("records launch only when blockers are resolved and preserves launchedAt", async () => {
    const { database, state } = createDomainLaunchDatabase();
    const result = await recordWebsiteLaunch({
      confirmWarnings: true,
      database,
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(result.website?.launchedAt).toBeInstanceOf(Date);
    const firstLaunch = state.website.launchedAt;
    await recordWebsiteLaunch({
      confirmWarnings: true,
      database,
      request: createRequest(),
      websiteId: "website_a",
    });
    expect(state.website.launchedAt).toBe(firstLaunch);
  });
});
