import { z } from "zod";

export function createEnvSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

export function requireProductionEnv(keys: string[], appName: string): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing = keys.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `${appName} is missing required production environment variables: ${missing.join(", ")}`,
    );
  }
}
