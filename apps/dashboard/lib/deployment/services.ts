import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import {
  auditLogs,
  deployments,
  domains,
  hostingProviderConnections,
  organizations,
  websiteApiCredentials,
  websiteEnvironments,
  websiteModules,
  websites,
} from "@agency/database/schema";
import {
  inspectDns,
  inspectDomainDiagnostics as inspectStoredHostnameDiagnostics,
  nodeDnsResolver,
  nodeTlsInspector,
  TLS_EXPIRY_WARNING_DAYS,
  type DnsDiagnosticResult,
  type DnsResolver,
  type DomainDiagnosticResult,
  type TlsDiagnosticResult,
  type TlsInspector,
} from "./diagnostics";
import { getProviderDefinition } from "./registry";
import { normalizeHostname } from "./domain-utils";
import type { DeploymentProviderId, DnsInstruction, ProviderConnectionContext } from "./types";
import { assertDashboardPermission, getScopedOrganizationIds } from "@/lib/dashboard/access";
import { getPagination } from "@/lib/dashboard/filters";
import { requireWebsiteAccess } from "@/lib/dashboard/projects";
import type { DashboardRequest, DashboardSearchParams } from "@/lib/dashboard/types";

type Database = ReturnType<typeof createDatabaseClient>;

export { normalizeHostname } from "./domain-utils";

export const deploymentLifecycleStatuses = [
  "queued",
  "deploying",
  "ready",
  "failed",
  "cancelled",
] as const;

export type DeploymentLifecycleStatus = (typeof deploymentLifecycleStatuses)[number];
export type DeploymentTriggerType = "manual" | "platform" | "provider" | "webhook";
export const domainDnsStates = ["unknown", "pending", "valid", "invalid"] as const;
export const domainSslStates = ["not_requested", "pending", "issued", "failed"] as const;
export type DomainDnsState = (typeof domainDnsStates)[number];
export type DomainSslState = (typeof domainSslStates)[number];
export type LaunchReadinessStatus = "blocker" | "pass" | "warning";

export interface LaunchReadinessItem {
  key: string;
  label: string;
  message: string;
  status: LaunchReadinessStatus;
}

export interface DomainDiagnosticDependencies {
  dnsResolver?: DnsResolver;
  tlsInspector?: TlsInspector;
}

const terminalDeploymentStatuses = ["ready", "failed", "cancelled"] as const;
const deploymentTransitions = {
  cancelled: [],
  deploying: ["ready", "failed", "cancelled"],
  failed: [],
  queued: ["deploying", "cancelled"],
  ready: [],
} satisfies Record<DeploymentLifecycleStatus, DeploymentLifecycleStatus[]>;

export class DeploymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentValidationError";
  }
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

function normalizeOptionalUrl(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? normalizeProductionUrl(trimmed) : null;
}

function normalizeSafeText(value: string | null | undefined, maxLength: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeCommitSha(value?: string | null) {
  const normalized = normalizeSafeText(value, 80);
  if (!normalized) return null;
  if (!/^[a-f0-9]{7,64}$/i.test(normalized)) {
    throw new DeploymentValidationError("Commit SHA must be a valid Git commit hash.");
  }

  return normalized;
}

function normalizeDeploymentStatus(value: string): DeploymentLifecycleStatus {
  if (deploymentLifecycleStatuses.includes(value as DeploymentLifecycleStatus)) {
    return value as DeploymentLifecycleStatus;
  }

  throw new DeploymentValidationError("Unsupported deployment status.");
}

function toWebsiteDeploymentStatus(status: DeploymentLifecycleStatus) {
  return status;
}

function assertValidDeploymentTransition({
  from,
  to,
}: {
  from: DeploymentLifecycleStatus;
  to: DeploymentLifecycleStatus;
}) {
  if (terminalDeploymentStatuses.includes(from as (typeof terminalDeploymentStatuses)[number])) {
    throw new DeploymentValidationError("Terminal deployments cannot be changed.");
  }

  if (!(deploymentTransitions[from] as readonly DeploymentLifecycleStatus[]).includes(to)) {
    throw new DeploymentValidationError(`Deployment cannot move from ${from} to ${to}.`);
  }
}

function safeDeploymentMetadata(input: {
  commitSha?: string | null;
  sourceReference?: string | null;
  triggerType: DeploymentTriggerType;
}) {
  return {
    ...(input.commitSha ? { commitSha: input.commitSha } : {}),
    ...(input.sourceReference ? { sourceReference: input.sourceReference } : {}),
    triggerType: input.triggerType,
  };
}

export function projectDeploymentMetadata(metadata: Record<string, unknown>) {
  return {
    commitSha: typeof metadata.commitSha === "string" ? metadata.commitSha : null,
    sourceReference: typeof metadata.sourceReference === "string" ? metadata.sourceReference : null,
    triggerType:
      metadata.triggerType === "platform" ||
      metadata.triggerType === "provider" ||
      metadata.triggerType === "webhook"
        ? metadata.triggerType
        : "manual",
  } satisfies {
    commitSha: string | null;
    sourceReference: string | null;
    triggerType: DeploymentTriggerType;
  };
}

function auditDeploymentMetadata(input: {
  deploymentId?: string | null;
  environmentId: string;
  status: DeploymentLifecycleStatus;
  triggerType: DeploymentTriggerType;
}) {
  return input;
}

function auditDomainMetadata(input: {
  dnsState?: DomainDnsState;
  domainId?: string | null;
  environmentId: string;
  hostname: string;
  sslState?: DomainSslState;
  websiteId: string;
}) {
  return input;
}

function normalizeDnsState(value: string): DomainDnsState {
  if (domainDnsStates.includes(value as DomainDnsState)) return value as DomainDnsState;
  throw new DeploymentValidationError("Unsupported DNS status.");
}

function normalizeSslState(value: string): DomainSslState {
  if (domainSslStates.includes(value as DomainSslState)) return value as DomainSslState;
  throw new DeploymentValidationError("Unsupported SSL status.");
}

function readinessItem(
  key: string,
  label: string,
  status: LaunchReadinessStatus,
  message: string,
): LaunchReadinessItem {
  return { key, label, message, status };
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

async function requireWebsiteEnvironment({
  database,
  environmentId,
  preferredType = "production",
  website,
}: {
  database: Database;
  environmentId?: string | null | undefined;
  preferredType?: "production" | "staging";
  website: { id: string; organizationId: string };
}) {
  const environment = await database.query.websiteEnvironments.findFirst({
    where: and(
      environmentId
        ? eq(websiteEnvironments.id, environmentId)
        : eq(websiteEnvironments.type, preferredType),
      eq(websiteEnvironments.organizationId, website.organizationId),
      eq(websiteEnvironments.websiteId, website.id),
    ),
  });

  if (!environment) {
    throw new DeploymentValidationError("Website environment was not found.");
  }

  return environment;
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
  const website = await requireWebsiteAccess({
    database,
    permission: "websites:manage",
    request,
    websiteId,
  });
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
    throw new DeploymentValidationError(
      validation.message ?? "Manual hosting settings are invalid.",
    );
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
  input: {
    commitSha?: string | null;
    deploymentUrl?: string | null;
    environmentId?: string | null | undefined;
    failureSummary?: string | null;
    notes?: string | null;
    sourceReference?: string | null;
    status: DeploymentLifecycleStatus;
  };
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "websites:manage",
    request,
    websiteId,
  });
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
  const environment = await requireWebsiteEnvironment({
    database,
    environmentId: input.environmentId,
    website,
  });

  const status = normalizeDeploymentStatus(input.status);
  const deploymentUrl = normalizeOptionalUrl(input.deploymentUrl) ?? connection.productionUrl;
  const now = new Date();
  const startedAt = status === "queued" ? null : now;
  const completedAt = terminalDeploymentStatuses.includes(
    status as (typeof terminalDeploymentStatuses)[number],
  )
    ? now
    : null;
  const metadata = safeDeploymentMetadata({
    commitSha: normalizeCommitSha(input.commitSha),
    sourceReference: normalizeSafeText(input.sourceReference, 160),
    triggerType: "manual",
  });
  const failureSummary =
    status === "failed" ? normalizeFailureSummary(input.failureSummary ?? input.notes) : null;
  const [deployment] = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(deployments)
      .values({
        completedAt,
        deploymentUrl,
        environment: environment.type,
        isProduction: environment.type === "production",
        failureSummary,
        metadata,
        notes: nullWhenEmpty(input.notes),
        organizationId: website.organizationId,
        provider: "manual",
        providerConnectionId: connection.id,
        providerDeploymentId: `manual-${now.getTime().toString()}`,
        startedAt,
        status,
        triggeredByUserId: request.context.user.id,
        websiteEnvironmentId: environment.id,
        websiteId: website.id,
      })
      .returning();

    await tx
      .update(websites)
      .set({
        deploymentStatus: toWebsiteDeploymentStatus(status),
        productionUrl: environment.type === "production" ? deploymentUrl : website.productionUrl,
        updatedAt: now,
      })
      .where(eq(websites.id, website.id));

    await tx.insert(auditLogs).values({
      action: "deployment.created",
      actorUserId: request.context.user.id,
      metadata: auditDeploymentMetadata({
        deploymentId: created?.id ?? null,
        environmentId: environment.id,
        status,
        triggerType: "manual",
      }),
      organizationId: website.organizationId,
      resourceId: created?.id ?? null,
      resourceType: "deployment",
    });

    return [created];
  });

  return deployment;
}

export function normalizeFailureSummary(value?: string | null) {
  const summary = normalizeSafeText(value, 500);
  if (!summary) return null;

  return summary
    .replace(/DATABASE_URL=[^\s]+/gi, "DATABASE_URL=[redacted]")
    .replace(/Authorization:\s*Bearer\s+[^\s]+/gi, "Authorization: Bearer [redacted]")
    .replace(/(token|secret|api[_-]?key)=([^\s]+)/gi, "$1=[redacted]");
}

async function requireDeploymentAccess({
  database,
  deploymentId,
  permission,
  request,
  websiteId,
}: {
  database: Database;
  deploymentId: string;
  permission: "deployments:read" | "deployments:trigger";
  request: DashboardRequest;
  websiteId?: string;
}) {
  const deployment = await database.query.deployments.findFirst({
    where: and(
      eq(deployments.id, deploymentId),
      websiteId ? eq(deployments.websiteId, websiteId) : undefined,
      isNull(deployments.deletedAt),
    ),
    with: {
      environment: true,
      organization: true,
      providerConnection: true,
      triggeredBy: true,
      website: true,
    },
  });
  if (!deployment) throw new DeploymentValidationError("Deployment was not found.");
  assertDashboardPermission(request, permission, deployment.organizationId);
  if (
    deployment.environment.organizationId !== deployment.organizationId ||
    deployment.environment.websiteId !== deployment.websiteId
  ) {
    throw new DeploymentValidationError("Deployment environment scope is invalid.");
  }

  return deployment;
}

export async function updateDeploymentStatus({
  database,
  deploymentId,
  failureSummary,
  request,
  status,
  websiteId,
}: {
  database: Database;
  deploymentId: string;
  failureSummary?: string | null;
  request: DashboardRequest;
  status: DeploymentLifecycleStatus;
  websiteId?: string;
}) {
  const deployment = await requireDeploymentAccess({
    database,
    deploymentId,
    permission: "deployments:trigger",
    request,
    ...(websiteId ? { websiteId } : {}),
  });
  const from = normalizeDeploymentStatus(deployment.status);
  assertValidDeploymentTransition({ from, to: status });
  const now = new Date();
  const completed = terminalDeploymentStatuses.includes(
    status as (typeof terminalDeploymentStatuses)[number],
  );
  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(deployments)
      .set({
        completedAt: completed ? now : deployment.completedAt,
        failureSummary: status === "failed" ? normalizeFailureSummary(failureSummary) : null,
        startedAt: status === "deploying" ? (deployment.startedAt ?? now) : deployment.startedAt,
        status,
        updatedAt: now,
      })
      .where(eq(deployments.id, deployment.id))
      .returning();

    if (!row) throw new DeploymentValidationError("Deployment could not be updated.");

    await tx
      .update(websites)
      .set({
        deploymentStatus: toWebsiteDeploymentStatus(status),
        updatedAt: now,
      })
      .where(eq(websites.id, deployment.websiteId));

    await tx.insert(auditLogs).values({
      action:
        status === "deploying"
          ? "deployment.started"
          : status === "ready"
            ? "deployment.succeeded"
            : status === "failed"
              ? "deployment.failed"
              : "deployment.cancelled",
      actorUserId: request.context.user.id,
      metadata: auditDeploymentMetadata({
        deploymentId: deployment.id,
        environmentId: deployment.websiteEnvironmentId,
        status,
        triggerType: projectDeploymentMetadata(deployment.metadata).triggerType,
      }),
      organizationId: deployment.organizationId,
      resourceId: deployment.id,
      resourceType: "deployment",
    });

    return [row];
  });

  return updated;
}

export async function addWebsiteDomain({
  database,
  domain,
  environmentId,
  request,
  websiteId,
}: {
  database: Database;
  domain: string;
  environmentId?: string | null | undefined;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({
    database,
    permission: "websites:manage",
    request,
    websiteId,
  });
  assertDashboardPermission(request, "domains:manage", website.organizationId);
  const hostname = normalizeHostname(domain);
  const existing = await database.query.domains.findFirst({
    where: and(eq(domains.domain, hostname), isNull(domains.deletedAt)),
  });
  if (existing) {
    throw new DeploymentValidationError("This domain is already connected to a website.");
  }
  const environment = await requireWebsiteEnvironment({ database, environmentId, website });

  const connection = await database.query.hostingProviderConnections.findFirst({
    where: and(
      eq(hostingProviderConnections.websiteId, website.id),
      isNull(hostingProviderConnections.deletedAt),
    ),
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
        websiteEnvironmentId: environment.id,
        websiteId: website.id,
      })
      .returning();

    await tx.insert(auditLogs).values({
      action: "domain.created",
      actorUserId: request.context.user.id,
      metadata: auditDomainMetadata({
        domainId: row?.id ?? null,
        environmentId: environment.id,
        hostname,
        websiteId: website.id,
      }),
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
  const domain = await requireDomainAccess({
    database,
    domainId,
    permission: "domains:manage",
    request,
  });
  if (domain.environment.type !== "production") {
    throw new DeploymentValidationError("Only production domains can be set as primary.");
  }
  const [updated] = await database.transaction(async (tx) => {
    await tx
      .update(domains)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(domains.websiteId, domain.websiteId),
          eq(domains.websiteEnvironmentId, domain.websiteEnvironmentId),
          isNull(domains.deletedAt),
        ),
      );
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
      action: "domain.primary_changed",
      actorUserId: request.context.user.id,
      metadata: auditDomainMetadata({
        domainId: domain.id,
        environmentId: domain.websiteEnvironmentId,
        hostname: domain.domain,
        websiteId: domain.websiteId,
      }),
      organizationId: domain.organizationId,
      resourceId: domain.id,
      resourceType: "domain",
    });
    return [row];
  });

  return updated;
}

export async function removeWebsiteDomain({
  database,
  domainId,
  request,
  websiteId,
}: {
  database: Database;
  domainId: string;
  request: DashboardRequest;
  websiteId: string;
}) {
  const domain = await requireDomainAccess({
    database,
    domainId,
    permission: "domains:manage",
    request,
    websiteId,
  });
  if (domain.isPrimary || domain.website.primaryDomain === domain.domain) {
    throw new DeploymentValidationError(
      "Primary production domains must be changed before removal.",
    );
  }

  const now = new Date();
  const [removed] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(domains)
      .set({ deletedAt: now, isPrimary: false, updatedAt: now })
      .where(eq(domains.id, domain.id))
      .returning();

    await tx.insert(auditLogs).values({
      action: "domain.removed",
      actorUserId: request.context.user.id,
      metadata: auditDomainMetadata({
        domainId: domain.id,
        environmentId: domain.websiteEnvironmentId,
        hostname: domain.domain,
        websiteId: domain.websiteId,
      }),
      organizationId: domain.organizationId,
      resourceId: domain.id,
      resourceType: "domain",
    });

    return [row];
  });

  return removed;
}

export async function updateDomainOperationalStatus({
  database,
  dnsState,
  domainId,
  request,
  sslState,
  websiteId,
}: {
  database: Database;
  dnsState?: string | null;
  domainId: string;
  request: DashboardRequest;
  sslState?: string | null;
  websiteId?: string;
}) {
  const domain = await requireDomainAccess({
    database,
    domainId,
    permission: "domains:manage",
    request,
    ...(websiteId ? { websiteId } : {}),
  });
  const normalizedDnsState = dnsState ? normalizeDnsState(dnsState) : null;
  const normalizedSslState = sslState ? normalizeSslState(sslState) : null;
  if (!normalizedDnsState && !normalizedSslState) {
    throw new DeploymentValidationError("Select a DNS or SSL status to update.");
  }

  const now = new Date();
  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(domains)
      .set({
        ...(normalizedDnsState ? { dnsState: normalizedDnsState } : {}),
        ...(normalizedSslState ? { sslState: normalizedSslState } : {}),
        lastCheckedAt: now,
        updatedAt: now,
        verificationStatus:
          normalizedDnsState === "valid" && normalizedSslState === "issued"
            ? "verified"
            : domain.verificationStatus,
      })
      .where(eq(domains.id, domain.id))
      .returning();

    if (normalizedDnsState) {
      await tx.insert(auditLogs).values({
        action: "domain.dns_status_updated",
        actorUserId: request.context.user.id,
        metadata: auditDomainMetadata({
          dnsState: normalizedDnsState,
          domainId: domain.id,
          environmentId: domain.websiteEnvironmentId,
          hostname: domain.domain,
          websiteId: domain.websiteId,
        }),
        organizationId: domain.organizationId,
        resourceId: domain.id,
        resourceType: "domain",
      });
    }

    if (normalizedSslState) {
      await tx.insert(auditLogs).values({
        action: "domain.ssl_status_updated",
        actorUserId: request.context.user.id,
        metadata: auditDomainMetadata({
          domainId: domain.id,
          environmentId: domain.websiteEnvironmentId,
          hostname: domain.domain,
          sslState: normalizedSslState,
          websiteId: domain.websiteId,
        }),
        organizationId: domain.organizationId,
        resourceId: domain.id,
        resourceType: "domain",
      });
    }

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
      createdAt: deployments.createdAt,
      deploymentUrl: deployments.deploymentUrl,
      environment: deployments.environment,
      environmentId: deployments.websiteEnvironmentId,
      id: deployments.id,
      metadata: deployments.metadata,
      organizationId: deployments.organizationId,
      organizationName: organizations.name,
      provider: deployments.provider,
      startedAt: deployments.startedAt,
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

  return {
    items: rows.map((row) => ({
      ...row,
      safeMetadata: projectDeploymentMetadata(row.metadata),
    })),
    page: params.page,
  };
}

export async function getDeploymentDetail({
  database,
  deploymentId,
  request,
  websiteId,
}: {
  database: Database;
  deploymentId: string;
  request: DashboardRequest;
  websiteId?: string;
}) {
  const deployment = await requireDeploymentAccess({
    database,
    deploymentId,
    permission: "deployments:read",
    request,
    ...(websiteId ? { websiteId } : {}),
  });

  return {
    ...deployment,
    safeMetadata: projectDeploymentMetadata(deployment.metadata),
  };
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
    params.status !== "all"
      ? eq(domains.verificationStatus, params.status as "pending")
      : undefined,
    params.query ? ilike(domains.domain, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const rows = await database
    .select({
      dnsState: domains.dnsState,
      domain: domains.domain,
      environmentId: domains.websiteEnvironmentId,
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

async function requireDomainForDiagnostics({
  database,
  domainId,
  request,
  websiteId,
}: {
  database: Database;
  domainId: string;
  request: DashboardRequest;
  websiteId: string;
}) {
  return requireDomainAccess({
    database,
    domainId,
    permission: "domains:read",
    request,
    websiteId,
  });
}

export async function inspectDomainDns({
  database,
  dependencies,
  domainId,
  request,
  websiteId,
}: {
  database: Database;
  dependencies?: Pick<DomainDiagnosticDependencies, "dnsResolver">;
  domainId: string;
  request: DashboardRequest;
  websiteId: string;
}): Promise<DnsDiagnosticResult> {
  const domain = await requireDomainForDiagnostics({ database, domainId, request, websiteId });
  return inspectDns(domain.domain, dependencies?.dnsResolver ?? nodeDnsResolver);
}

export async function inspectDomainTls({
  database,
  dependencies,
  domainId,
  request,
  websiteId,
}: {
  database: Database;
  dependencies?: Pick<DomainDiagnosticDependencies, "tlsInspector">;
  domainId: string;
  request: DashboardRequest;
  websiteId: string;
}): Promise<TlsDiagnosticResult> {
  const domain = await requireDomainForDiagnostics({ database, domainId, request, websiteId });
  return (dependencies?.tlsInspector ?? nodeTlsInspector).inspect(domain.domain);
}

export async function inspectDomainDiagnostics({
  database,
  dependencies,
  domainId,
  request,
  websiteId,
}: {
  database: Database;
  dependencies?: DomainDiagnosticDependencies;
  domainId: string;
  request: DashboardRequest;
  websiteId: string;
}): Promise<DomainDiagnosticResult> {
  const domain = await requireDomainForDiagnostics({ database, domainId, request, websiteId });
  return inspectStoredHostnameDiagnostics({
    hostname: domain.domain,
    ...(dependencies?.dnsResolver ? { dnsResolver: dependencies.dnsResolver } : {}),
    ...(dependencies?.tlsInspector ? { tlsInspector: dependencies.tlsInspector } : {}),
  });
}

export async function getWebsiteDomains({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, request, websiteId });
  assertDashboardPermission(request, "domains:read", website.organizationId);
  const [domainRows, environmentRows] = await Promise.all([
    database.query.domains.findMany({
      where: and(
        eq(domains.organizationId, website.organizationId),
        eq(domains.websiteId, website.id),
        isNull(domains.deletedAt),
      ),
      orderBy: (table, { desc: sortDesc }) => [
        sortDesc(table.isPrimary),
        sortDesc(table.updatedAt),
      ],
      with: { environment: true },
    }),
    database.query.websiteEnvironments.findMany({
      where: and(
        eq(websiteEnvironments.organizationId, website.organizationId),
        eq(websiteEnvironments.websiteId, website.id),
      ),
      orderBy: (table, { asc }) => [asc(table.type)],
    }),
  ]);

  return { domains: domainRows, environments: environmentRows, website };
}

export async function getWebsiteLaunchReadiness({
  database,
  diagnostics = false,
  diagnosticDependencies,
  request,
  websiteId,
}: {
  database: Database;
  diagnostics?: boolean;
  diagnosticDependencies?: DomainDiagnosticDependencies;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, request, websiteId });
  assertDashboardPermission(request, "websites:read", website.organizationId);
  const productionEnvironment = await database.query.websiteEnvironments.findFirst({
    where: and(
      eq(websiteEnvironments.organizationId, website.organizationId),
      eq(websiteEnvironments.websiteId, website.id),
      eq(websiteEnvironments.type, "production"),
    ),
  });
  const productionDomains = productionEnvironment
    ? await database.query.domains.findMany({
        where: and(
          eq(domains.organizationId, website.organizationId),
          eq(domains.websiteId, website.id),
          eq(domains.websiteEnvironmentId, productionEnvironment.id),
          isNull(domains.deletedAt),
        ),
        orderBy: (table, { desc: sortDesc }) => [
          sortDesc(table.isPrimary),
          sortDesc(table.updatedAt),
        ],
        with: { environment: true },
      })
    : [];
  const primaryDomain =
    productionDomains.find((domain) => domain.isPrimary) ??
    productionDomains.find((domain) => domain.domain === website.primaryDomain) ??
    null;
  const latestProductionDeployment = productionEnvironment
    ? await database.query.deployments.findFirst({
        where: and(
          eq(deployments.organizationId, website.organizationId),
          eq(deployments.websiteId, website.id),
          eq(deployments.websiteEnvironmentId, productionEnvironment.id),
          isNull(deployments.deletedAt),
        ),
        orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
        with: { environment: true },
      })
    : null;
  const activeProductionCredential =
    productionEnvironment && website.websiteType === "sharoz_connected"
      ? await database.query.websiteApiCredentials.findFirst({
          where: and(
            eq(websiteApiCredentials.organizationId, website.organizationId),
            eq(websiteApiCredentials.websiteId, website.id),
            eq(websiteApiCredentials.websiteEnvironmentId, productionEnvironment.id),
            eq(websiteApiCredentials.status, "active"),
          ),
        })
      : null;
  const enabledModules = await database.query.websiteModules.findMany({
    where: and(
      eq(websiteModules.organizationId, website.organizationId),
      eq(websiteModules.websiteId, website.id),
      eq(websiteModules.enabled, true),
    ),
    columns: { moduleKey: true },
  });

  const observedDiagnostics =
    diagnostics && primaryDomain
      ? await inspectStoredHostnameDiagnostics({
          hostname: primaryDomain.domain,
          ...(diagnosticDependencies?.dnsResolver
            ? { dnsResolver: diagnosticDependencies.dnsResolver }
            : {}),
          ...(diagnosticDependencies?.tlsInspector
            ? { tlsInspector: diagnosticDependencies.tlsInspector }
            : {}),
        }).catch(() => null)
      : null;
  const expectedProductionUrl = primaryDomain ? `https://${primaryDomain.domain}` : null;
  const checks: LaunchReadinessItem[] = [
    productionEnvironment
      ? readinessItem(
          "production_environment",
          "Production environment",
          "pass",
          "A production environment exists.",
        )
      : readinessItem(
          "production_environment",
          "Production environment",
          "blocker",
          "Create a production environment before launch.",
        ),
    productionDomains.length > 0
      ? readinessItem(
          "production_domain",
          "Production domain",
          "pass",
          "At least one production domain is assigned.",
        )
      : readinessItem(
          "production_domain",
          "Production domain",
          "blocker",
          "Assign a production domain before launch.",
        ),
    primaryDomain
      ? readinessItem(
          "primary_domain",
          "Primary production domain",
          "pass",
          `${primaryDomain.domain} is the primary production domain.`,
        )
      : readinessItem(
          "primary_domain",
          "Primary production domain",
          "blocker",
          "Select a production domain as primary before launch.",
        ),
    latestProductionDeployment?.status === "ready"
      ? readinessItem(
          "production_deployment",
          "Production deployment",
          "pass",
          "The latest production deployment is ready.",
        )
      : readinessItem(
          "production_deployment",
          "Production deployment",
          "blocker",
          "Record a ready production deployment before launch.",
        ),
    expectedProductionUrl && website.productionUrl === expectedProductionUrl
      ? readinessItem(
          "production_url",
          "Production URL",
          "pass",
          "The website production URL matches the primary domain.",
        )
      : expectedProductionUrl
        ? readinessItem(
            "production_url",
            "Production URL",
            "warning",
            `Production URL should be ${expectedProductionUrl}.`,
          )
        : readinessItem(
            "production_url",
            "Production URL",
            "warning",
            "Production URL will be synchronized after a primary domain is selected.",
          ),
    primaryDomain?.dnsState === "valid"
      ? readinessItem("dns", "DNS readiness", "pass", "DNS is marked valid.")
      : readinessItem(
          "dns",
          "DNS readiness",
          "blocker",
          "DNS must be marked valid after real operational verification.",
        ),
    primaryDomain?.sslState === "issued"
      ? readinessItem("ssl", "SSL readiness", "pass", "SSL is marked issued.")
      : readinessItem(
          "ssl",
          "SSL readiness",
          "blocker",
          "SSL must be marked issued after real operational verification.",
        ),
    website.websiteType === "sharoz_connected"
      ? activeProductionCredential
        ? readinessItem(
            "production_credential",
            "Production API credential",
            "pass",
            "An active production website credential exists.",
          )
        : readinessItem(
            "production_credential",
            "Production API credential",
            "blocker",
            "Create an active production credential for this connected website.",
          )
      : readinessItem(
          "production_credential",
          "Production API credential",
          "pass",
          "This website type does not require Sharoz Connected credentials.",
        ),
    enabledModules.length > 0
      ? readinessItem(
          "enabled_modules",
          "Enabled modules",
          "pass",
          `${enabledModules.length.toString()} enabled module(s) are configured at platform level.`,
        )
      : readinessItem(
          "enabled_modules",
          "Enabled modules",
          "warning",
          "No business modules are enabled. This may be expected for simple brochure sites.",
        ),
  ];

  if (observedDiagnostics) {
    checks.push(
      observedDiagnostics.dns.status === "resolved"
        ? readinessItem(
            "observed_dns",
            "Observed DNS diagnostic",
            "pass",
            "Current DNS diagnostic found public records for the primary domain.",
          )
        : readinessItem(
            "observed_dns",
            "Observed DNS diagnostic",
            "warning",
            `Current DNS diagnostic is ${observedDiagnostics.dns.status}. Manual DNS status remains the launch gate.`,
          ),
    );

    checks.push(
      observedDiagnostics.tls.status === "valid"
        ? readinessItem(
            "observed_tls",
            "Observed TLS diagnostic",
            observedDiagnostics.tls.expiresSoon ? "warning" : "pass",
            observedDiagnostics.tls.expiresSoon
              ? `TLS certificate is valid but expires within ${TLS_EXPIRY_WARNING_DAYS.toString()} days.`
              : "Current TLS diagnostic found an authorized certificate.",
          )
        : readinessItem(
            "observed_tls",
            "Observed TLS diagnostic",
            "warning",
            `Current TLS diagnostic is ${observedDiagnostics.tls.status}. Manual SSL status remains the launch gate.`,
          ),
    );
  }

  return {
    blockers: checks.filter((item) => item.status === "blocker"),
    checks,
    diagnostics: observedDiagnostics,
    latestProductionDeployment,
    primaryDomain,
    productionDomains,
    productionEnvironment,
    warnings: checks.filter((item) => item.status === "warning"),
    website,
  };
}

export async function recordWebsiteLaunch({
  confirmWarnings = false,
  database,
  request,
  websiteId,
}: {
  confirmWarnings?: boolean;
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const readiness = await getWebsiteLaunchReadiness({ database, request, websiteId });
  assertDashboardPermission(request, "websites:manage", readiness.website.organizationId);
  if (readiness.blockers.length > 0) {
    throw new DeploymentValidationError("Resolve launch blockers before recording launch.");
  }
  if (readiness.warnings.length > 0 && !confirmWarnings) {
    throw new DeploymentValidationError("Confirm launch warnings before recording launch.");
  }

  if (readiness.website.launchedAt) {
    return { readiness, website: readiness.website };
  }

  const now = new Date();
  const primaryDomain = readiness.primaryDomain?.domain ?? readiness.website.primaryDomain;
  const [website] = await database.transaction(async (tx) => {
    const [updated] = await tx
      .update(websites)
      .set({
        launchedAt: now,
        primaryDomain,
        productionUrl: primaryDomain ? `https://${primaryDomain}` : readiness.website.productionUrl,
        status: "active",
        updatedAt: now,
      })
      .where(eq(websites.id, readiness.website.id))
      .returning();

    await tx.insert(auditLogs).values({
      action: "website.launch_recorded",
      actorUserId: request.context.user.id,
      metadata: {
        primaryDomain,
        productionEnvironmentId: readiness.productionEnvironment?.id ?? null,
        websiteId: readiness.website.id,
      },
      organizationId: readiness.website.organizationId,
      resourceId: readiness.website.id,
      resourceType: "website",
    });

    return [updated];
  });

  return { readiness, website };
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
  const [connections, domainRows, deploymentRows, environmentRows] = await Promise.all([
    database.query.hostingProviderConnections.findMany({
      where: and(
        eq(hostingProviderConnections.websiteId, website.id),
        isNull(hostingProviderConnections.deletedAt),
      ),
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.updatedAt)],
    }),
    database.query.domains.findMany({
      where: and(eq(domains.websiteId, website.id), isNull(domains.deletedAt)),
      orderBy: (table, { desc: sortDesc }) => [
        sortDesc(table.isPrimary),
        sortDesc(table.updatedAt),
      ],
      with: { environment: true },
    }),
    database.query.deployments.findMany({
      where: and(eq(deployments.websiteId, website.id), isNull(deployments.deletedAt)),
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
      limit: 10,
      with: { environment: true },
    }),
    database.query.websiteEnvironments.findMany({
      where: and(
        eq(websiteEnvironments.organizationId, website.organizationId),
        eq(websiteEnvironments.websiteId, website.id),
      ),
      orderBy: (table, { asc }) => [asc(table.type)],
    }),
  ]);
  return {
    connections,
    deployments: deploymentRows,
    domains: domainRows,
    environments: environmentRows,
    website,
  };
}

async function requireDomainAccess({
  database,
  domainId,
  permission,
  request,
  websiteId,
}: {
  database: Database;
  domainId: string;
  permission: "domains:manage" | "domains:read";
  request: DashboardRequest;
  websiteId?: string;
}) {
  const domain = await database.query.domains.findFirst({
    where: and(
      eq(domains.id, domainId),
      websiteId ? eq(domains.websiteId, websiteId) : undefined,
      isNull(domains.deletedAt),
    ),
    with: { environment: true, organization: true, providerConnection: true, website: true },
  });
  if (!domain) throw new DeploymentValidationError("Domain was not found.");
  assertDashboardPermission(request, permission, domain.organizationId);
  if (
    domain.website.organizationId !== domain.organizationId ||
    domain.environment.organizationId !== domain.organizationId ||
    domain.environment.websiteId !== domain.websiteId
  ) {
    throw new DeploymentValidationError("Domain environment scope is invalid.");
  }
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
