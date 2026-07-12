CREATE TYPE "public"."deployment_provider" AS ENUM('vercel', 'manual', 'netlify', 'cloudflare');--> statement-breakpoint
CREATE TYPE "public"."hosting_connection_status" AS ENUM('not_connected', 'connected', 'invalid', 'unsupported');--> statement-breakpoint
CREATE TYPE "public"."deployment_environment" AS ENUM('production', 'preview', 'staging', 'development');--> statement-breakpoint
ALTER TYPE "public"."deployment_status" ADD VALUE IF NOT EXISTS 'pending';--> statement-breakpoint
ALTER TYPE "public"."deployment_status" ADD VALUE IF NOT EXISTS 'building';--> statement-breakpoint
ALTER TYPE "public"."deployment_status" ADD VALUE IF NOT EXISTS 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."deployment_status" ADD VALUE IF NOT EXISTS 'unknown';--> statement-breakpoint
CREATE TABLE "hosting_provider_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"provider" "deployment_provider" NOT NULL,
	"status" "hosting_connection_status" DEFAULT 'not_connected' NOT NULL,
	"provider_project_id" text,
	"provider_team_id" text,
	"credential_reference" text,
	"dashboard_url" text,
	"production_url" text,
	"deployment_method" text,
	"notes" text,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"provider_connection_id" uuid,
	"provider" "deployment_provider" NOT NULL,
	"provider_deployment_id" text,
	"environment" "deployment_environment" DEFAULT 'production' NOT NULL,
	"status" "deployment_status" DEFAULT 'unknown' NOT NULL,
	"deployment_url" text,
	"is_production" boolean DEFAULT false NOT NULL,
	"triggered_by_user_id" uuid,
	"failure_summary" text,
	"notes" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"provider_created_at" timestamp with time zone,
	"synchronized_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "provider_connection_id" uuid;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "provider_domain_id" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "required_dns_records" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hosting_provider_connections" ADD CONSTRAINT "hosting_provider_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosting_provider_connections" ADD CONSTRAINT "hosting_provider_connections_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_provider_connection_id_hosting_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."hosting_provider_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_triggered_by_user_id_users_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_provider_connection_id_hosting_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."hosting_provider_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hosting_connections_website_provider_idx" ON "hosting_provider_connections" USING btree ("website_id","provider");--> statement-breakpoint
CREATE INDEX "hosting_connections_organization_idx" ON "hosting_provider_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hosting_connections_status_idx" ON "hosting_provider_connections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "deployments_provider_deployment_idx" ON "deployments" USING btree ("provider","provider_deployment_id");--> statement-breakpoint
CREATE INDEX "deployments_organization_website_idx" ON "deployments" USING btree ("organization_id","website_id");--> statement-breakpoint
CREATE INDEX "deployments_website_status_idx" ON "deployments" USING btree ("website_id","status");--> statement-breakpoint
CREATE INDEX "deployments_provider_connection_idx" ON "deployments" USING btree ("provider_connection_id");--> statement-breakpoint
CREATE INDEX "deployments_created_at_idx" ON "deployments" USING btree ("created_at");
