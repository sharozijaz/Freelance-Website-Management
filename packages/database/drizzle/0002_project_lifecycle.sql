ALTER TYPE "public"."project_status" ADD VALUE IF NOT EXISTS 'internal_review';
ALTER TYPE "public"."project_status" ADD VALUE IF NOT EXISTS 'client_review';
ALTER TYPE "public"."project_status" ADD VALUE IF NOT EXISTS 'ready_to_launch';
ALTER TYPE "public"."project_status" ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE "public"."project_status" ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE "public"."project_status" ADD VALUE IF NOT EXISTS 'cancelled';
