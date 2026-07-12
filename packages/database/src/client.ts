import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export interface CreateDatabaseClientOptions {
  connectionString: string;
  connectTimeoutSeconds?: number;
  maxConnections?: number;
  prepare?: boolean;
}

export function createDatabaseClient({
  connectTimeoutSeconds = 5,
  connectionString,
  maxConnections = 10,
  prepare = true,
}: CreateDatabaseClientOptions) {
  const client = postgres(connectionString, {
    connect_timeout: connectTimeoutSeconds,
    max: maxConnections,
    prepare,
  });

  return drizzle(client, { schema });
}
