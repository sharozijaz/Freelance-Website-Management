import { createAuth } from "@agency/auth/server";
import { createDatabaseClient } from "@agency/database";

const database = createDatabaseClient({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/agency_platform",
});

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
