CREATE TYPE "public"."website_api_credential_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "website_api_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"label" text NOT NULL,
	"public_key" text NOT NULL,
	"secret_hash" text NOT NULL,
	"status" "website_api_credential_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_api_credentials" ADD CONSTRAINT "website_api_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_api_credentials" ADD CONSTRAINT "website_api_credentials_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_api_credentials" ADD CONSTRAINT "website_api_credentials_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_api_credentials" ADD CONSTRAINT "website_api_credentials_website_organization_fk" FOREIGN KEY ("website_id","organization_id") REFERENCES "public"."websites"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "website_api_credentials_public_key_idx" ON "website_api_credentials" USING btree ("public_key");--> statement-breakpoint
CREATE INDEX "website_api_credentials_organization_website_idx" ON "website_api_credentials" USING btree ("organization_id","website_id");--> statement-breakpoint
CREATE INDEX "website_api_credentials_website_status_idx" ON "website_api_credentials" USING btree ("website_id","status");