import { pgEnum } from "drizzle-orm/pg-core";

export const organizationStatusEnum = pgEnum("organization_status", [
  "active",
  "suspended",
  "archived",
]);

export const organizationPlanEnum = pgEnum("organization_plan", [
  "starter",
  "growth",
  "scale",
  "enterprise",
]);

export const userStatusEnum = pgEnum("user_status", ["invited", "active", "disabled", "archived"]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "agency_owner",
  "agency_admin",
  "client_admin",
  "editor",
  "writer",
  "viewer",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "invited",
  "active",
  "disabled",
  "removed",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const websiteStatusEnum = pgEnum("website_status", [
  "draft",
  "active",
  "paused",
  "archived",
]);

export const websiteTypeEnum = pgEnum("website_type", [
  "wordpress",
  "sharoz_connected",
  "external_legacy",
]);

export const websiteModuleKeyEnum = pgEnum("website_module_key", [
  "blog",
  "forms",
  "media",
  "seo",
  "catalog",
  "orders",
  "customers",
  "booking",
]);

export const websiteApiCredentialStatusEnum = pgEnum("website_api_credential_status", [
  "active",
  "revoked",
]);

export const websiteEnvironmentTypeEnum = pgEnum("website_environment_type", [
  "staging",
  "production",
]);

export const websiteEnvironmentStatusEnum = pgEnum("website_environment_status", [
  "active",
  "inactive",
]);

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "not_configured",
  "pending",
  "queued",
  "building",
  "deploying",
  "ready",
  "failed",
  "cancelled",
  "unknown",
]);

export const deploymentProviderEnum = pgEnum("deployment_provider", [
  "vercel",
  "manual",
  "netlify",
  "cloudflare",
]);

export const hostingConnectionStatusEnum = pgEnum("hosting_connection_status", [
  "not_connected",
  "connected",
  "invalid",
  "unsupported",
]);

export const deploymentEnvironmentEnum = pgEnum("deployment_environment", [
  "production",
  "preview",
  "staging",
  "development",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "design",
  "development",
  "internal_review",
  "client_review",
  "ready_to_launch",
  "review",
  "live",
  "on_hold",
  "completed",
  "cancelled",
  "paused",
  "archived",
]);

export const domainVerificationStatusEnum = pgEnum("domain_verification_status", [
  "pending",
  "verified",
  "failed",
]);

export const dnsStateEnum = pgEnum("dns_state", ["unknown", "pending", "valid", "invalid"]);

export const sslStateEnum = pgEnum("ssl_state", ["not_requested", "pending", "issued", "failed"]);

export const contentPlaceholderStatusEnum = pgEnum("content_placeholder_status", [
  "draft",
  "published",
  "archived",
]);

export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published", "archived"]);

export const formFieldTypeEnum = pgEnum("form_field_type", [
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "consent",
  "hidden",
]);

export const formSubmissionStatusEnum = pgEnum("form_submission_status", [
  "new",
  "read",
  "archived",
  "spam",
]);
