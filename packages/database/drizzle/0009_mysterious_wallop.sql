ALTER TABLE "website_environments" ADD COLUMN "preview_access_token_hash" text;--> statement-breakpoint
ALTER TABLE "website_environments" ADD COLUMN "preview_access_token_rotated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "website_environments" ADD COLUMN "staging_access_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "website_environments" ADD COLUMN "staging_access_secret_hash" text;--> statement-breakpoint
ALTER TABLE "website_environments" ADD COLUMN "staging_access_secret_rotated_at" timestamp with time zone;