import type { z } from "zod";

export const deploymentProviderIds = ["vercel", "manual", "netlify", "cloudflare"] as const;
export type DeploymentProviderId = (typeof deploymentProviderIds)[number];

export const deploymentCapabilities = [
  "connect",
  "validateConnection",
  "getProject",
  "listDeployments",
  "getDeployment",
  "triggerDeployment",
  "getDeploymentStatus",
  "getProductionURL",
  "listDomains",
  "addDomain",
  "removeDomain",
  "verifyDomain",
  "getRequiredDNSRecords",
] as const;

export type DeploymentCapability = (typeof deploymentCapabilities)[number];
export type NormalizedDeploymentStatus =
  | "pending"
  | "queued"
  | "building"
  | "ready"
  | "failed"
  | "cancelled"
  | "unknown";

export type DeploymentEnvironment = "development" | "preview" | "production" | "staging";

export interface DnsInstruction {
  name: string;
  priority?: number | null;
  purpose?: string | null;
  ttl?: number | null;
  type: string;
  value: string;
}

export interface ProviderConnectionContext {
  configuration: Record<string, unknown>;
  credentialReference?: string | null;
  providerProjectId?: string | null;
  providerTeamId?: string | null;
}

export interface NormalizedProviderDeployment {
  completedAt?: Date | null;
  deploymentUrl?: string | null;
  environment: DeploymentEnvironment;
  failureSummary?: string | null;
  isProduction: boolean;
  providerCreatedAt?: Date | null;
  providerDeploymentId: string;
  status: NormalizedDeploymentStatus;
}

export interface DeploymentProviderAdapter {
  addDomain?: (input: { connection: ProviderConnectionContext; hostname: string }) => Promise<void>;
  connect?: (input: { connection: ProviderConnectionContext }) => Promise<{ ok: boolean }>;
  getProductionURL?: (input: { connection: ProviderConnectionContext }) => Promise<string | null>;
  getProject?: (input: { connection: ProviderConnectionContext }) => Promise<{
    dashboardUrl?: string | null;
    name?: string | null;
    productionUrl?: string | null;
  } | null>;
  getRequiredDNSRecords?: (input: {
    connection: ProviderConnectionContext;
    hostname: string;
  }) => Promise<DnsInstruction[]>;
  listDeployments?: (input: {
    connection: ProviderConnectionContext;
  }) => Promise<NormalizedProviderDeployment[]>;
  listDomains?: (input: {
    connection: ProviderConnectionContext;
  }) => Promise<{ hostname: string; verified: boolean }[]>;
  removeDomain?: (input: { connection: ProviderConnectionContext; hostname: string }) => Promise<void>;
  triggerDeployment?: (input: {
    connection: ProviderConnectionContext;
  }) => Promise<NormalizedProviderDeployment>;
  validateConnection?: (input: { connection: ProviderConnectionContext }) => Promise<{
    message?: string;
    ok: boolean;
  }>;
  verifyDomain?: (input: {
    connection: ProviderConnectionContext;
    hostname: string;
  }) => Promise<{ requiredRecords?: DnsInstruction[]; status: "failed" | "pending" | "unknown" | "verified" }>;
}

export interface DeploymentProviderDefinition {
  adapter: DeploymentProviderAdapter;
  capabilities: DeploymentCapability[];
  configurationSchema: z.ZodType;
  credentialRequirements: string[];
  documentationUrl?: string;
  id: DeploymentProviderId;
  name: string;
}
