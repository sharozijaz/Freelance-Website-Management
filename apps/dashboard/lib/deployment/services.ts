import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import {
  auditLogs,
  deployments,
  domains,
  hostingProviderConnections,
  organizations,
  websites,
} from "@agency/database/schema";
import { getProviderDefinition } from "./registry";
import type { DeploymentProviderId, DnsInstruction, ProviderConnectionContext } from "./types";
import { assertDashboardPermission, getScopedOrganizationIds } from "@/lib/dashboard/access";
import { getPagination } from "@/lib/dashboard/filters";
import { requireWebsiteAccess } from "@/lib/dashboard/projects";
import type { DashboardRequest, DashboardSearchParams } from "@/lib/dashboard/types";

type Database = ReturnType<typeof createDatabaseClient>;

export class DeploymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentValidationError";
  }
}

export function normalizeHostname(input: string) {
  const value = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!value) throw new DeploymentValidationError("Domain is required.");
  if (value.includes(":") || value.includes("?") || value.includes("#")) {
    throw new DeploymentValidationError("Enter a domain name without paths, ports, or query strings.");
  }
  if (!/^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(value)) {
    throw new DeploymentValidationError("Enter a valid domain name.");
  }
  return value;
}

export function normalizeProductionUrl(input: string) {
  const trimmed = input.trim();
  const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new DeploymentValidationError("Production URL must use HTTP or HTTPS.");
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function nullWhenEmpty(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

type OrganizationColumn = typeof deployments.organizationId | typeof domains.organizationId;

function scopedOrganizationCondition(
  request: DashboardRequest,
  column: OrganizationColumn = deployments.organizationId,
) {
  const ids = getScopedOrganizationIds(request);
  if (ids === null) return undefined;
  if (ids.length === 0) return sql`false`;
  return inArray(column, ids);
}

function connectionContext(connection: {
  configuration: Record<string, unknown>;
  credentialReference: string | null;
  providerProjectId: string | null;
  providerTeamId: string | null;
}): ProviderConnectionContext {
  return {
    configuration: connection.configuration,
    credentialReference: connection.credentialReference,
    providerProjectId: connection.providerProjectId,
    providerTeamId: connection.providerTeamId,
  };
}

export async function upsertManualHostingConnection({
  database,
  input,
  request,
  websiteId,
}: {
  database: Database;
  input: {
    dashboardUrl?: string | null;
    deploymentMethod: string;
    hostingProviderName: string;
    notes?: string | null;
    productionUrl: string;
  };
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, permission: "websites:manage", request, websiteId });
  assertDashboardPermission(request, "hosting:manage", website.organizationId);

  const productionUrl = normalizeProductionUrl(input.productionUrl);
  const provider = getProviderDefinition("manual");
  const configuration = provider.configurationSchema.parse({
    dashboardUrl: input.dashboardUrl?.trim() ?? "",
    deploymentMethod: input.deploymentMethod.trim(),
    hostingProviderName: input.hostingProviderName.trim(),
    notes: input.notes?.trim() ?? "",
    productionUrl,
  }) as Record<string, unknown>;
  const validation = await provider.adapter.validateConnection?.({
    connection: {
      configuration,
      credentialReference: null,
      providerProjectId: null,
      providerTeamId: null,
    },
  });
  if (validation && !validation.ok) {
    throw new DeploymentValidationError(validation.message ?? "Manual hosting settings are invalid.");
  }

  const [connection] = await database.transaction(async (tx) => {
    const existing = await tx.query.hostingProviderConnections.findFirst({
      where: and(
        eq(hostingProviderConnections.websiteId, website.id),
        eq(hostingProviderConnections.provider, "manual"),
        isNull(hostingProviderConnections.deletedAt),
      ),
    });

    const values = {
      configuration,
      dashboardUrl: nullWhenEmpty(input.dashboardUrl),
      deploymentMethod: input.deploymentMethod.trim(),
      notes: nullWhenEmpty(input.notes),
      organizationId: website.organizationId,
      productionUrl,
      status: "connected" as const,
      updatedAt: new Date(),
      websiteId: website.id,
    };

    const [saved] = existing
      ? await tx
          .update(hostingProviderConnections)
          .set(values)
          .where(eq(hostingProviderConnections.id, existing.id))
          .returning()
      : await tx
          .insert(hostingProviderConnections)
          .values({ ...values, provider: "manual" })
          .returning();

    await tx
      .update(websites)
      .set({ deploymentStatus: "ready", productionUrl, updatedAt: new Date() })
      .where(eq(websites.id, website.id));

    await tx.insert(auditLogs).values({
      action: existing ? "hosting.connection_updated" : "hosting.connection_created",
      actorUserId: request.context.user.id,
      metadata: { provider: "manual", productionUrl },
      organizationId: website.organizationId,
      resourceId: saved?.id ?? null,
      resourceType: "hosting_connection",
    });

    return [saved];
  });

  return connection;
}

export async function recordManualDeployment({
  database,
  input,
  request,
  websiteId,
}: {
  database: Database;
  input: { deploymentUrl?: string | null; notes?: string | null; status: "failed" | "ready" };
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, permission: "websites:manage", request, websiteId });
  assertDashboardPermission(request, "deployments:trigger", website.organizationId);
  const connection = await database.query.hostingProviderConnections.findFirst({
    where: and(
      eq(hostingProviderConnections.websiteId, website.id),
      eq(hostingProviderConnections.provider, "manual"),
      isNull(hostingProviderConnections.deletedAt),
    ),
  });
  if (!connection) {
    throw new DeploymentValidationError("Connect manual hosting before recording a deployment.");
  }

  const deploymentUrl = input.deploymentUrl ? normalizeProductionUrl(input.deploymentUrl) : connection.productionUrl;
  const [deployment] = await database.transaction(async (tx) => {
    const now = new Date();
    const [created] = await tx
      .insert(deployments)
      .values({
        completedAt: now,
        deploymentUrl,
        environment: "production",
        isProduction: true,
        metadata: {},
        notes: nullWhenEmpty(input.notes),
        organizationId: website.organizationId,
        provider: "manual",
        providerConnectionId: connection.id,
        providerDeploymentId: `manual-${now.getTime().toString()}`,
        startedAt: now,
        status: input.status,
        triggeredByUserId: request.context.user.id,
        websiteId: website.id,
      })
      .returning();

    await tx
      .update(websites)
      .set({
        deploymentStatus: input.status,
        productionUrl: deploymentUrl,
        updatedAt: now,
      })
      .where(eq(websites.id, website.id));

    await tx.insert(auditLogs).values({
      action: "deployment.recorded",
      actorUserId: request.context.user.id,
      metadata: { provider: "manual", status: input.status },
      organizationId: website.organizationId,
      resourceId: created?.id ?? null,
      resourceType: "deployment",
    });

    return [created];
  });

  return deployment;
}

export async function addWebsiteDomain({
  database,
  domain,
  request,
  websiteId,
}: {
  database: Database;
  domain: string;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, permission: "websites:manage", request, websiteId });
  assertDashboardPermission(request, "domains:manage", website.organizationId);
  const hostname = normalizeHostname(domain);
  const existing = await database.query.domains.findFirst({
    where: and(eq(domains.domain, hostname), isNull(domains.deletedAt)),
  });
  if (existing) {
    throw new DeploymentValidationError("This domain is already connected to a website.");
  }

  const connection = await database.query.hostingProviderConnections.findFirst({
    where: and(eq(hostingProviderConnections.websiteId, website.id), isNull(hostingProviderConnections.deletedAt)),
    orderBy: (table, { desc: sortDesc }) => [sortDesc(table.updatedAt)],
  });
  const provider = connection ? getProviderDefinition(connection.provider) : null;
  const requiredRecords =
    provider?.adapter.getRequiredDNSRecords && connection
      ? await provider.adapter.getRequiredDNSRecords({
          connection: connectionContext(connection),
          hostname,
        })
      : defaultDnsInstructions(hostname);

  const [created] = await database.transaction(async (tx) => {
    const [row] = await tx
      .insert(domains)
      .values({
        dnsState: "unknown",
        domain: hostname,
        isPrimary: false,
        organizationId: website.organizationId,
        providerConnectionId: connection?.id ?? null,
        requiredDnsRecords: requiredRecords,
        sslState: "pending",
        verificationStatus: "pending",
        websiteId: website.id,
      })
      .returning();

    await tx.insert(auditLogs).values({
      action: "domain.added",
      actorUserId: request.context.user.id,
      metadata: { domain: hostname, provider: connection?.provider ?? null },
      organizationId: website.organizationId,
      resourceId: row?.id ?? null,
      resourceType: "domain",
    });

    return [row];
  });

  return created;
}

export async function setPrimaryDomain({
  database,
  domainId,
  request,
}: {
  database: Database;
  domainId: string;
  request: DashboardRequest;
}) {
  const domain = await requireDomainAccess({ database, domainId, permission: "domains:manage", request });
  const [updated] = await database.transaction(async (tx) => {
    await tx
      .update(domains)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(and(eq(domains.websiteId, domain.websiteId), isNull(domains.deletedAt)));
    const [row] = await tx
      .update(domains)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(domains.id, domain.id))
      .returning();
    await tx
      .update(websites)
      .set({
        primaryDomain: domain.domain,
        productionUrl: `https://${domain.domain}`,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, domain.websiteId));
    await tx.insert(auditLogs).values({
      action: "domain.primary_set",
      actorUserId: request.context.user.id,
      metadata: { domain: domain.domain },
      organizationId: domain.organizationId,
      resourceId: domain.id,
      resourceType: "domain",
    });
    return [row];
  });

  return updated;
}

export async function getDeployments({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams & { provider?: string; websiteId?: string };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "deployments:read", params.organizationId);
  const { limit, offset } = getPagination(params);
  const orgCondition = params.organizationId
    ? eq(deployments.organizationId, params.organizationId)
    : scopedOrganizationCondition(request);
  const conditions = [
    isNull(deployments.deletedAt),
    orgCondition,
    params.websiteId ? eq(deployments.websiteId, params.websiteId) : undefined,
    params.status !== "all" ? eq(deployments.status, params.status as "ready") : undefined,
    params.provider && params.provider !== "all"
      ? eq(deployments.provider, params.provider as DeploymentProviderId)
      : undefined,
    params.query ? ilike(websites.name, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const rows = await database
    .select({
      completedAt: deployments.completedAt,
      deploymentUrl: deployments.deploymentUrl,
      environment: deployments.environment,
      id: deployments.id,
      organizationId: deployments.organizationId,
      organizationName: organizations.name,
      provider: deployments.provider,
      status: deployments.status,
      websiteId: deployments.websiteId,
      websiteName: websites.name,
    })
    .from(deployments)
    .innerJoin(websites, eq(deployments.websiteId, websites.id))
    .innerJoin(organizations, eq(deployments.organizationId, organizations.id))
    .where(and(...conditions))
    .orderBy(desc(deployments.createdAt))
    .limit(limit)
    .offset(offset);

  return { items: rows, page: params.page };
}

export async function getDeploymentDetail({
  database,
  deploymentId,
  request,
}: {
  database: Database;
  deploymentId: string;
  request: DashboardRequest;
}) {
  const deployment = await database.query.deployments.findFirst({
    where: and(eq(deployments.id, deploymentId), isNull(deployments.deletedAt)),
    with: { organization: true, triggeredBy: true, website: true },
  });
  if (!deployment) throw new DeploymentValidationError("Deployment was not found.");
  assertDashboardPermission(request, "deployments:read", deployment.organizationId);
  return deployment;
}

export async function getDomains({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams & { websiteId?: string };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "domains:read", params.organizationId);
  const { limit, offset } = getPagination(params);
  const orgCondition = params.organizationId
    ? eq(domains.organizationId, params.organizationId)
    : scopedOrganizationCondition(request, domains.organizationId);
  const conditions = [
    isNull(domains.deletedAt),
    orgCondition,
    params.websiteId ? eq(domains.websiteId, params.websiteId) : undefined,
    params.status !== "all" ? eq(domains.verificationStatus, params.status as "pending") : undefined,
    params.query ? ilike(domains.domain, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const rows = await database
    .select({
      dnsState: domains.dnsState,
      domain: domains.domain,
      id: domains.id,
      isPrimary: domains.isPrimary,
      organizationId: domains.organizationId,
      organizationName: organizations.name,
      sslState: domains.sslState,
      verificationStatus: domains.verificationStatus,
      websiteId: domains.websiteId,
      websiteName: websites.name,
    })
    .from(domains)
    .innerJoin(websites, eq(domains.websiteId, websites.id))
    .innerJoin(organizations, eq(domains.organizationId, organizations.id))
    .where(and(...conditions))
    .orderBy(desc(domains.updatedAt))
    .limit(limit)
    .offset(offset);

  return { items: rows, page: params.page };
}

export async function getDomainDetail({
  database,
  domainId,
  request,
}: {
  database: Database;
  domainId: string;
  request: DashboardRequest;
}) {
  return requireDomainAccess({ database, domainId, permission: "domains:read", request });
}

export async function getWebsiteHosting({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, request, websiteId });
  assertDashboardPermission(request, "deployments:read", website.organizationId);
  const [connections, domainRows, deploymentRows] = await Promise.all([
    database.query.hostingProviderConnections.findMany({
      where: and(eq(hostingProviderConnections.websiteId, website.id), isNull(hostingProviderConnections.deletedAt)),
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.updatedAt)],
    }),
    database.query.domains.findMany({
      where: and(eq(domains.websiteId, website.id), isNull(domains.deletedAt)),
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.isPrimary), sortDesc(table.updatedAt)],
    }),
    database.query.deployments.findMany({
      where: and(eq(deployments.websiteId, website.id), isNull(deployments.deletedAt)),
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
      limit: 10,
    }),
  ]);
  return { connections, deployments: deploymentRows, domains: domainRows, website };
}

async function requireDomainAccess({
  database,
  domainId,
  permission,
  request,
}: {
  database: Database;
  domainId: string;
  permission: "domains:manage" | "domains:read";
  request: DashboardRequest;
}) {
  const domain = await database.query.domains.findFirst({
    where: and(eq(domains.id, domainId), isNull(domains.deletedAt)),
    with: { organization: true, providerConnection: true, website: true },
  });
  if (!domain) throw new DeploymentValidationError("Domain was not found.");
  assertDashboardPermission(request, permission, domain.organizationId);
  return domain;
}

function defaultDnsInstructions(hostname: string): DnsInstruction[] {
  return [
    {
      name: hostname.startsWith("www.") ? "www" : "@",
      purpose: "Point this hostname to the selected hosting provider.",
      ttl: 3600,
      type: hostname.startsWith("www.") ? "CNAME" : "A",
      value: "Provider supplied value",
    },
  ];
}
