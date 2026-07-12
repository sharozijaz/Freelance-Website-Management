import { createDatabaseClient } from "@agency/database";

export const database = createDatabaseClient({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/agency_platform",
});
