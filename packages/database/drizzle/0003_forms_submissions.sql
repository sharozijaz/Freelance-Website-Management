CREATE TYPE "public"."form_field_type" AS ENUM('text', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'consent', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."form_submission_status" AS ENUM('new', 'read', 'archived', 'spam');--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"type" "form_field_type" NOT NULL,
	"placeholder" text,
	"help_text" text,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_value" text,
	"validation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"field_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"status" "form_submission_status" DEFAULT 'new' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"spam_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "form_fields_form_name_idx" ON "form_fields" USING btree ("form_id","name");--> statement-breakpoint
CREATE INDEX "form_fields_organization_website_idx" ON "form_fields" USING btree ("organization_id","website_id");--> statement-breakpoint
CREATE INDEX "form_fields_form_order_idx" ON "form_fields" USING btree ("form_id","field_order");--> statement-breakpoint
CREATE INDEX "form_submissions_organization_website_idx" ON "form_submissions" USING btree ("organization_id","website_id");--> statement-breakpoint
CREATE INDEX "form_submissions_form_status_idx" ON "form_submissions" USING btree ("form_id","status");--> statement-breakpoint
CREATE INDEX "form_submissions_submitted_at_idx" ON "form_submissions" USING btree ("organization_id","submitted_at");
