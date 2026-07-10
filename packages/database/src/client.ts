import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export interface CreateDatabaseClientOptions {
  connectionString: string;
  maxConnections?: number;
  prepare?: boolean;
}

export function createDatabaseClient({
  connectionString,
  maxConnections = 10,
  prepare = true,
}: CreateDatabaseClientOptions) {
  const client = postgres(connectionString, {
    max: maxConnections,
    prepare,
  });

  return drizzle(client, { schema });
}
