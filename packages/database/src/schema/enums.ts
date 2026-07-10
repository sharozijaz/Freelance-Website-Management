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

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "not_configured",
  "queued",
  "deploying",
  "ready",
  "failed",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "design",
  "development",
  "review",
  "live",
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
