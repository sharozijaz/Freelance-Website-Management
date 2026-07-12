import { z } from "zod";
import type {
  DeploymentCapability,
  DeploymentProviderAdapter,
  DeploymentProviderDefinition,
  DeploymentProviderId,
} from "./types";
import { manualProviderAdapter } from "./providers/manual";
import { vercelProviderAdapter } from "./providers/vercel";

const unsupportedProviderAdapter: DeploymentProviderAdapter = {};

export const providerRegistry = {
  cloudflare: {
    adapter: unsupportedProviderAdapter,
    capabilities: [],
    configurationSchema: z.object({}),
    credentialRequirements: ["Cloudflare Pages API token and account scope are not connected yet."],
    documentationUrl: "https://developers.cloudflare.com/pages/",
    id: "cloudflare",
    name: "Cloudflare Pages",
  },
  manual: {
    adapter: manualProviderAdapter,
    capabilities: ["connect", "validateConnection", "getProductionURL"],
    configurationSchema: z.object({
      dashboardUrl: z.url().optional().or(z.literal("")),
      deploymentMethod: z.string().min(2),
      hostingProviderName: z.string().min(2),
      notes: z.string().optional(),
      productionUrl: z.url(),
    }),
    credentialRequirements: [],
    id: "manual",
    name: "Manual / External Hosting",
  },
  netlify: {
    adapter: unsupportedProviderAdapter,
    capabilities: [],
    configurationSchema: z.object({}),
    credentialRequirements: ["Netlify API token and site ID are not connected yet."],
    documentationUrl: "https://docs.netlify.com/api/get-started/",
    id: "netlify",
    name: "Netlify",
  },
  vercel: {
    adapter: vercelProviderAdapter,
    capabilities: [
      "validateConnection",
      "getProject",
      "listDeployments",
      "triggerDeployment",
      "getProductionURL",
      "listDomains",
      "addDomain",
      "removeDomain",
      "verifyDomain",
      "getRequiredDNSRecords",
    ],
    configurationSchema: z.object({
      projectId: z.string().min(1),
      teamId: z.string().optional(),
    }),
    credentialRequirements: ["VERCEL_API_TOKEN environment variable"],
    documentationUrl: "https://vercel.com/docs/rest-api",
    id: "vercel",
    name: "Vercel",
  },
} satisfies Record<DeploymentProviderId, DeploymentProviderDefinition>;

export function getProviderDefinition(providerId: DeploymentProviderId) {
  return providerRegistry[providerId];
}

export function hasProviderCapability(
  providerId: DeploymentProviderId,
  capability: DeploymentCapability,
) {
  return (getProviderDefinition(providerId).capabilities as DeploymentCapability[]).includes(capability);
}

export function listProviderDefinitions() {
  return Object.values(providerRegistry);
}
