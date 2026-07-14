import { createAuth } from "@agency/auth/server";
import { requireProductionEnv } from "@agency/lib/env";
import { database } from "./database";

requireProductionEnv(["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"], "Dashboard");

export const auth = createAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database,
  secret: process.env.BETTER_AUTH_SECRET ?? "development-secret-change-before-production",
  trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});

export { database };
