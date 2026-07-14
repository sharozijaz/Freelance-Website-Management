import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { requireProductionEnv } from "@agency/lib/env";
import { buildConfig } from "payload";
import sharp from "sharp";
import { collections } from "./collections";
import { globals } from "./globals";

requireProductionEnv(["DATABASE_URL", "PAYLOAD_SECRET"], "Payload CMS");

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/agency_platform";

const cmsSecret = process.env.PAYLOAD_SECRET ?? "development-payload-secret-change-me";

export const cmsFoundation = buildConfig({
  admin: {
    importMap: {
      importMapFile: "app/(payload)/admin/importMap.ts",
    },
    meta: {
      titleSuffix: " - Agency CMS",
    },
    user: "cms-users",
  },
  collections,
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
    },
    schemaName: "payload_cms",
  }),
  editor: lexicalEditor({}),
  globals,
  secret: cmsSecret,
  sharp,
  typescript: {
    outputFile: "src/payload-types.ts",
  },
});

export default cmsFoundation;
