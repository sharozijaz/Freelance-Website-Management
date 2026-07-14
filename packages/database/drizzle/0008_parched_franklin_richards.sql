CREATE TYPE "public"."website_environment_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."website_environment_type" AS ENUM('staging', 'production');--> statement-breakpoint
CREATE TABLE "website_environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"type" "website_environment_type" NOT NULL,
	"name" text NOT NULL,
	"status" "website_environment_status" DEFAULT 'active' NOT NULL,
	"base_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_environments" ADD CONSTRAINT "website_environments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_environments" ADD CONSTRAINT "website_environments_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_environments" ADD CONSTRAINT "website_environments_website_organization_fk" FOREIGN KEY ("website_id","organization_id") REFERENCES "public"."websites"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "website_environments_website_type_idx" ON "website_environments" USING btree ("website_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "website_environments_id_website_org_idx" ON "website_environments" USING btree ("id","website_id","organization_id");--> statement-breakpoint
CREATE INDEX "website_environments_organization_website_idx" ON "website_environments" USING btree ("organization_id","website_id");--> statement-breakpoint
INSERT INTO "website_environments" ("organization_id", "website_id", "type", "name", "status", "base_url")
SELECT "organization_id", "id", 'production'::"website_environment_type", 'Production', 'active'::"website_environment_status", "production_url"
FROM "websites"
ON CONFLICT ("website_id", "type") DO NOTHING;
--> statement-breakpoint
INSERT INTO "website_environments" ("organization_id", "website_id", "type", "name", "status", "base_url")
SELECT DISTINCT
  "organization_id",
  "id",
  'staging'::"website_environment_type",
  'Staging',
  'active'::"website_environment_status",
  "preview_url"
FROM "websites"
WHERE (
    "website_type" = 'sharoz_connected'::"website_type"
    OR EXISTS (
      SELECT 1
      FROM "website_api_credentials"
      WHERE "website_api_credentials"."website_id" = "websites"."id"
    )
    OR EXISTS (
      SELECT 1
      FROM "deployments"
      WHERE "deployments"."website_id" = "websites"."id"
        AND "deployments"."environment" IN (
          'staging'::"deployment_environment",
          'preview'::"deployment_environment",
          'development'::"deployment_environment"
        )
    )
  )
ON CONFLICT ("website_id", "type") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "website_environment_id" uuid;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "website_environment_id" uuid;--> statement-breakpoint
ALTER TABLE "website_api_credentials" ADD COLUMN "website_environment_id" uuid;--> statement-breakpoint
UPDATE "website_api_credentials"
SET "website_environment_id" = "website_environments"."id"
FROM "website_environments"
WHERE "website_api_credentials"."website_id" = "website_environments"."website_id"
  AND "website_api_credentials"."organization_id" = "website_environments"."organization_id"
  AND "website_environments"."type" = 'staging'::"website_environment_type";
--> statement-breakpoint
UPDATE "domains"
SET "website_environment_id" = "website_environments"."id"
FROM "website_environments"
WHERE "domains"."website_id" = "website_environments"."website_id"
  AND "domains"."organization_id" = "website_environments"."organization_id"
  AND "website_environments"."type" = 'production'::"website_environment_type";
--> statement-breakpoint
UPDATE "deployments"
SET "website_environment_id" = "website_environments"."id"
FROM "website_environments"
WHERE "deployments"."website_id" = "website_environments"."website_id"
  AND "deployments"."organization_id" = "website_environments"."organization_id"
  AND (
    (
      "deployments"."environment" = 'production'::"deployment_environment"
      AND "website_environments"."type" = 'production'::"website_environment_type"
    )
    OR (
      "deployments"."environment" <> 'production'::"deployment_environment"
      AND "website_environments"."type" = 'staging'::"website_environment_type"
    )
  );
--> statement-breakpoint
UPDATE "deployments"
SET "website_environment_id" = "website_environments"."id"
FROM "website_environments"
WHERE "deployments"."website_environment_id" IS NULL
  AND "deployments"."website_id" = "website_environments"."website_id"
  AND "deployments"."organization_id" = "website_environments"."organization_id"
  AND "website_environments"."type" = 'production'::"website_environment_type";
--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "website_environment_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "website_environment_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "website_api_credentials" ALTER COLUMN "website_environment_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_website_environment_id_website_environments_id_fk" FOREIGN KEY ("website_environment_id") REFERENCES "public"."website_environments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_environment_scope_fk" FOREIGN KEY ("website_environment_id","website_id","organization_id") REFERENCES "public"."website_environments"("id","website_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_website_environment_id_website_environments_id_fk" FOREIGN KEY ("website_environment_id") REFERENCES "public"."website_environments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_environment_scope_fk" FOREIGN KEY ("website_environment_id","website_id","organization_id") REFERENCES "public"."website_environments"("id","website_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_api_credentials" ADD CONSTRAINT "website_api_credentials_website_environment_id_website_environments_id_fk" FOREIGN KEY ("website_environment_id") REFERENCES "public"."website_environments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_api_credentials" ADD CONSTRAINT "website_api_credentials_environment_scope_fk" FOREIGN KEY ("website_environment_id","website_id","organization_id") REFERENCES "public"."website_environments"("id","website_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deployments_environment_idx" ON "deployments" USING btree ("website_environment_id");--> statement-breakpoint
CREATE INDEX "domains_environment_idx" ON "domains" USING btree ("website_environment_id");--> statement-breakpoint
CREATE INDEX "website_api_credentials_environment_idx" ON "website_api_credentials" USING btree ("website_environment_id");
