import type { DeploymentProviderAdapter } from "../types";

export const manualProviderAdapter: DeploymentProviderAdapter = {
  connect: () => Promise.resolve({ ok: true }),
  getProductionURL: ({ connection }) =>
    Promise.resolve(
      typeof connection.configuration.productionUrl === "string"
        ? connection.configuration.productionUrl
        : null,
    ),
  validateConnection: ({ connection }) =>
    Promise.resolve({
      ok:
        typeof connection.configuration.hostingProviderName === "string" &&
        typeof connection.configuration.productionUrl === "string",
    }),
};
