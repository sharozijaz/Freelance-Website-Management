CREATE TYPE "public"."website_module_key" AS ENUM('blog', 'forms', 'media', 'seo', 'catalog', 'orders', 'customers', 'booking');--> statement-breakpoint
CREATE TYPE "public"."website_type" AS ENUM('wordpress', 'sharoz_connected', 'external_legacy');--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "website_type" "website_type" DEFAULT 'external_legacy' NOT NULL;--> statement-breakpoint
CREATE TABLE "website_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"module_key" "website_module_key" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_modules" ADD CONSTRAINT "website_modules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_modules" ADD CONSTRAINT "website_modules_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "websites_id_organization_idx" ON "websites" USING btree ("id","organization_id");--> statement-breakpoint
ALTER TABLE "website_modules" ADD CONSTRAINT "website_modules_website_organization_fk" FOREIGN KEY ("website_id","organization_id") REFERENCES "public"."websites"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "website_modules_website_module_idx" ON "website_modules" USING btree ("website_id","module_key");--> statement-breakpoint
CREATE INDEX "website_modules_organization_website_idx" ON "website_modules" USING btree ("organization_id","website_id");--> statement-breakpoint
CREATE INDEX "website_modules_organization_module_idx" ON "website_modules" USING btree ("organization_id","module_key");--> statement-breakpoint
CREATE INDEX "website_modules_website_enabled_idx" ON "website_modules" USING btree ("website_id","enabled");--> statement-breakpoint
CREATE INDEX "websites_organization_type_idx" ON "websites" USING btree ("organization_id","website_type");
