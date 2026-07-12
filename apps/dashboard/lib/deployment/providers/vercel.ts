import type {
  DeploymentProviderAdapter,
  DnsInstruction,
  NormalizedDeploymentStatus,
  NormalizedProviderDeployment,
} from "../types";

function normalizeVercelState(value: string | null | undefined): NormalizedDeploymentStatus {
  switch (value?.toUpperCase()) {
    case "BUILDING":
    case "INITIALIZING":
      return "building";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    case "ERROR":
    case "FAILED":
      return "failed";
    case "QUEUED":
      return "queued";
    case "READY":
      return "ready";
    case "PENDING":
      return "pending";
    default:
      return "unknown";
  }
}

function token() {
  return process.env.VERCEL_API_TOKEN;
}

function vercelHeaders() {
  const apiToken = token();

  if (!apiToken) {
    throw new Error("Vercel API token is not configured.");
  }

  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

function projectQuery(projectId?: string | null, teamId?: string | null) {
  const search = new URLSearchParams();
  if (projectId) search.set("projectId", projectId);
  if (teamId) search.set("teamId", teamId);
  return search.toString();
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function requireProjectId(connection: { providerProjectId?: string | null }) {
  if (!connection.providerProjectId) {
    throw new Error("Vercel project ID is required.");
  }

  return encodeURIComponent(connection.providerProjectId);
}

function toDate(value: unknown): Date | null {
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function normalizeDeployment(item: Record<string, unknown>): NormalizedProviderDeployment {
  const id = stringValue(item.uid) ?? stringValue(item.id) ?? stringValue(item.name) ?? crypto.randomUUID();
  const url = typeof item.url === "string" ? `https://${item.url.replace(/^https?:\/\//, "")}` : null;

  return {
    completedAt: toDate(item.ready) ?? null,
    deploymentUrl: url,
    environment: item.target === "production" ? "production" : "preview",
    failureSummary: typeof item.errorMessage === "string" ? item.errorMessage : null,
    isProduction: item.target === "production",
    providerCreatedAt: toDate(item.createdAt) ?? null,
    providerDeploymentId: id,
    status: normalizeVercelState(typeof item.state === "string" ? item.state : null),
  };
}

async function listVercelDeployments(
  connection: Parameters<NonNullable<DeploymentProviderAdapter["listDeployments"]>>[0]["connection"],
) {
  const query = projectQuery(connection.providerProjectId, connection.providerTeamId);
  const response = await fetch(`https://api.vercel.com/v6/deployments?${query}`, {
    headers: vercelHeaders(),
  });
  if (!response.ok) throw new Error("Vercel deployments could not be loaded.");
  const payload = (await response.json()) as { deployments?: Record<string, unknown>[] };
  return (payload.deployments ?? []).map(normalizeDeployment);
}

export function normalizeVercelDeploymentState(value: string | null | undefined) {
  return normalizeVercelState(value);
}

const vercelDnsInstructions: DnsInstruction[] = [
  {
    name: "@",
    purpose: "Point apex domain to Vercel.",
    ttl: 3600,
    type: "A",
    value: "76.76.21.21",
  },
  {
    name: "www",
    purpose: "Point www subdomain to Vercel.",
    ttl: 3600,
    type: "CNAME",
    value: "cname.vercel-dns.com",
  },
];

export const vercelProviderAdapter: DeploymentProviderAdapter = {
  addDomain: async ({ connection, hostname }) => {
    const query = connection.providerTeamId ? `?teamId=${connection.providerTeamId}` : "";
    const projectId = requireProjectId(connection);
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains${query}`,
      {
        body: JSON.stringify({ name: hostname }),
        headers: vercelHeaders(),
        method: "POST",
      },
    );
    if (!response.ok) throw new Error("Vercel domain add failed.");
  },
  getProductionURL: async ({ connection }) => {
    const deployments = await listVercelDeployments(connection);
    return deployments.find((deployment) => deployment.isProduction && deployment.status === "ready")
      ?.deploymentUrl ?? null;
  },
  getProject: async ({ connection }) => {
    if (!connection.providerProjectId) return null;
    const query = connection.providerTeamId ? `?teamId=${connection.providerTeamId}` : "";
    const projectId = requireProjectId(connection);
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}${query}`,
      {
        headers: vercelHeaders(),
      },
    );
    if (!response.ok) throw new Error("Vercel project could not be loaded.");
    const payload = (await response.json()) as Record<string, unknown>;
    return {
      dashboardUrl:
        typeof payload.accountId === "string" && typeof payload.name === "string"
          ? `https://vercel.com/${payload.accountId}/${payload.name}`
          : null,
      name: typeof payload.name === "string" ? payload.name : null,
      productionUrl: typeof payload.latestDeployments === "string" ? payload.latestDeployments : null,
    };
  },
  getRequiredDNSRecords: (): Promise<DnsInstruction[]> => Promise.resolve(vercelDnsInstructions),
  listDeployments: async ({ connection }) => listVercelDeployments(connection),
  listDomains: async ({ connection }) => {
    const query = connection.providerTeamId ? `?teamId=${connection.providerTeamId}` : "";
    const projectId = requireProjectId(connection);
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains${query}`,
      {
        headers: vercelHeaders(),
      },
    );
    if (!response.ok) throw new Error("Vercel domains could not be loaded.");
    const payload = (await response.json()) as { domains?: Record<string, unknown>[] };
    return (payload.domains ?? []).map((domain) => ({
      hostname: stringValue(domain.name) ?? "",
      verified: Boolean(domain.verified),
    })).filter((domain) => domain.hostname.length > 0);
  },
  removeDomain: async ({ connection, hostname }) => {
    const query = connection.providerTeamId ? `?teamId=${connection.providerTeamId}` : "";
    const projectId = requireProjectId(connection);
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(hostname)}${query}`,
      {
        headers: vercelHeaders(),
        method: "DELETE",
      },
    );
    if (!response.ok) throw new Error("Vercel domain remove failed.");
  },
  triggerDeployment: () =>
    Promise.reject(new Error("Vercel deployment triggers require a configured deploy hook URL.")),
  validateConnection: async ({ connection }) => {
    if (!token()) return { message: "VERCEL_API_TOKEN is not configured.", ok: false };
    if (!connection.providerProjectId) return { message: "Vercel project ID is required.", ok: false };
    const query = connection.providerTeamId ? `?teamId=${connection.providerTeamId}` : "";
    const projectId = requireProjectId(connection);
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}${query}`,
      {
        headers: vercelHeaders(),
      },
    );
    return { ok: response.ok };
  },
  verifyDomain: async ({ connection, hostname }) => {
    const query = connection.providerTeamId ? `?teamId=${connection.providerTeamId}` : "";
    const projectId = requireProjectId(connection);
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(hostname)}/verify${query}`,
      {
        headers: vercelHeaders(),
        method: "POST",
      },
    );
    if (!response.ok) return { requiredRecords: vercelDnsInstructions, status: "pending" };
    return { status: "verified" };
  },
};
