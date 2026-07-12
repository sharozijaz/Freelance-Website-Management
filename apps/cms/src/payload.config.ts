import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { collections } from "./collections";
import { globals } from "./globals";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/agency_platform";

const cmsSecret = process.env.PAYLOAD_SECRET ?? "development-payload-secret-change-me";

export const cmsFoundation = buildConfig({
  admin: {
    meta: {
      titleSuffix: " - Agency CMS",
    },
  },
  collections,
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
    },
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
