import { describe, expect, it } from "vitest";
import { getProviderDefinition, hasProviderCapability, listProviderDefinitions } from "./registry";
import { normalizeVercelDeploymentState } from "./providers/vercel";

describe("deployment provider registry", () => {
  it("resolves providers without switch statements", () => {
    expect(getProviderDefinition("manual").name).toBe("Manual / External Hosting");
    expect(listProviderDefinitions().map((provider) => provider.id)).toContain("vercel");
  });

  it("detects supported capabilities per provider", () => {
    expect(hasProviderCapability("manual", "triggerDeployment")).toBe(false);
    expect(hasProviderCapability("manual", "getProductionURL")).toBe(true);
    expect(hasProviderCapability("netlify", "listDeployments")).toBe(false);
  });

  it("normalizes Vercel deployment states", () => {
    expect(normalizeVercelDeploymentState("READY")).toBe("ready");
    expect(normalizeVercelDeploymentState("BUILDING")).toBe("building");
    expect(normalizeVercelDeploymentState("ERROR")).toBe("failed");
    expect(normalizeVercelDeploymentState("CANCELED")).toBe("cancelled");
    expect(normalizeVercelDeploymentState("mystery")).toBe("unknown");
  });
});
