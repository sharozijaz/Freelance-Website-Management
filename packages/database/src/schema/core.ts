import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  deploymentEnvironmentEnum,
  deploymentProviderEnum,
  deploymentStatusEnum,
  dnsStateEnum,
  domainVerificationStatusEnum,
  hostingConnectionStatusEnum,
  invitationStatusEnum,
  membershipRoleEnum,
  membershipStatusEnum,
  organizationPlanEnum,
  organizationStatusEnum,
  projectStatusEnum,
  sslStateEnum,
  userStatusEnum,
  websiteStatusEnum,
} from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: organizationStatusEnum("status").notNull().default("active"),
    plan: organizationPlanEnum("plan").notNull().default("starter"),
    timezone: text("timezone").notNull().default("UTC"),
    locale: text("locale").notNull().default("en"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("organizations_slug_idx").on(table.slug),
    index("organizations_status_idx").on(table.status),
    index("organizations_deleted_at_idx").on(table.deletedAt),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    status: userStatusEnum("status").notNull().default("invited"),
    profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
    timezone: text("timezone").notNull().default("UTC"),
    locale: text("locale").notNull().default("en"),
    avatarUrl: text("avatar_url"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_status_idx").on(table.status),
    index("users_deleted_at_idx").on(table.deletedAt),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    activeOrganizationId: uuid("active_organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("auth_sessions_token_idx").on(table.token),
    index("auth_sessions_user_idx").on(table.userId),
    index("auth_sessions_active_organization_idx").on(table.activeOrganizationId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("auth_accounts_provider_account_idx").on(table.providerId, table.accountId),
    index("auth_accounts_user_idx").on(table.userId),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("auth_verifications_identifier_idx").on(table.identifier),
    index("auth_verifications_expires_at_idx").on(table.expiresAt),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("invited"),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("memberships_organization_user_idx").on(table.organizationId, table.userId),
    index("memberships_organization_role_idx").on(table.organizationId, table.role),
    index("memberships_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const websites = pgTable(
  "websites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: websiteStatusEnum("status").notNull().default("draft"),
    theme: jsonb("theme").$type<Record<string, unknown>>().notNull().default({}),
    primaryDomain: text("primary_domain"),
    deploymentStatus: deploymentStatusEnum("deployment_status").notNull().default("not_configured"),
    productionUrl: text("production_url"),
    previewUrl: text("preview_url"),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("websites_organization_slug_idx").on(table.organizationId, table.slug),
    index("websites_organization_status_idx").on(table.organizationId, table.status),
    index("websites_organization_deployment_status_idx").on(
      table.organizationId,
      table.deploymentStatus,
    ),
  ],
);

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    verificationStatus: domainVerificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    isPrimary: boolean("is_primary").notNull().default(false),
    dnsState: dnsStateEnum("dns_state").notNull().default("unknown"),
    sslState: sslStateEnum("ssl_state").notNull().default("not_requested"),
    providerConnectionId: uuid("provider_connection_id"),
    providerDomainId: text("provider_domain_id"),
    requiredDnsRecords: jsonb("required_dns_records")
      .$type<
        {
          name: string;
          priority?: number | null;
          purpose?: string | null;
          ttl?: number | null;
          type: string;
          value: string;
        }[]
      >()
      .notNull()
      .default([]),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    vercelDomainId: text("vercel_domain_id"),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("domains_domain_idx").on(table.domain),
    index("domains_organization_website_idx").on(table.organizationId, table.websiteId),
    index("domains_organization_primary_idx").on(table.organizationId, table.isPrimary),
    index("domains_verification_status_idx").on(table.verificationStatus),
  ],
);

export const hostingProviderConnections = pgTable(
  "hosting_provider_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    provider: deploymentProviderEnum("provider").notNull(),
    status: hostingConnectionStatusEnum("status").notNull().default("not_connected"),
    providerProjectId: text("provider_project_id"),
    providerTeamId: text("provider_team_id"),
    credentialReference: text("credential_reference"),
    dashboardUrl: text("dashboard_url"),
    productionUrl: text("production_url"),
    deploymentMethod: text("deployment_method"),
    notes: text("notes"),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("hosting_connections_website_provider_idx").on(table.websiteId, table.provider),
    index("hosting_connections_organization_idx").on(table.organizationId),
    index("hosting_connections_status_idx").on(table.status),
  ],
);

export const deployments = pgTable(
  "deployments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    providerConnectionId: uuid("provider_connection_id").references(
      () => hostingProviderConnections.id,
      { onDelete: "set null" },
    ),
    provider: deploymentProviderEnum("provider").notNull(),
    providerDeploymentId: text("provider_deployment_id"),
    environment: deploymentEnvironmentEnum("environment").notNull().default("production"),
    status: deploymentStatusEnum("status").notNull().default("unknown"),
    deploymentUrl: text("deployment_url"),
    isProduction: boolean("is_production").notNull().default(false),
    triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    failureSummary: text("failure_summary"),
    notes: text("notes"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    providerCreatedAt: timestamp("provider_created_at", { withTimezone: true }),
    synchronizedAt: timestamp("synchronized_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("deployments_provider_deployment_idx").on(table.provider, table.providerDeploymentId),
    index("deployments_organization_website_idx").on(table.organizationId, table.websiteId),
    index("deployments_website_status_idx").on(table.websiteId, table.status),
    index("deployments_provider_connection_idx").on(table.providerConnectionId),
    index("deployments_created_at_idx").on(table.createdAt),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: projectStatusEnum("status").notNull().default("planning"),
    figmaUrl: text("figma_url"),
    launchTargetAt: timestamp("launch_target_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("projects_organization_slug_idx").on(table.organizationId, table.slug),
    index("projects_organization_website_idx").on(table.organizationId, table.websiteId),
    index("projects_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const projectAssignments = pgTable(
  "project_assignments",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.projectId, table.userId],
      name: "project_assignments_pk",
    }),
    index("project_assignments_organization_user_idx").on(table.organizationId, table.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: membershipRoleEnum("role").notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    tokenHash: text("token_hash").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("invitations_token_hash_idx").on(table.tokenHash),
    index("invitations_organization_email_idx").on(table.organizationId, table.email),
    index("invitations_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_organization_created_at_idx").on(table.organizationId, table.createdAt),
    index("audit_logs_organization_resource_idx").on(
      table.organizationId,
      table.resourceType,
      table.resourceId,
    ),
    index("audit_logs_actor_idx").on(table.actorUserId),
  ],
);

export const organizationRelations = relations(organizations, ({ many }) => ({
  auditLogs: many(auditLogs),
  domains: many(domains),
  deployments: many(deployments),
  hostingProviderConnections: many(hostingProviderConnections),
  invitations: many(invitations),
  memberships: many(memberships),
  projectAssignments: many(projectAssignments),
  projects: many(projects),
  websites: many(websites),
}));

export const userRelations = relations(users, ({ many }) => ({
  acceptedInvitations: many(invitations, { relationName: "acceptedInvitations" }),
  authAccounts: many(authAccounts),
  authSessions: many(authSessions),
  assignedProjects: many(projectAssignments, { relationName: "assignedProjects" }),
  auditLogs: many(auditLogs),
  invitationsSent: many(invitations, { relationName: "invitationsSent" }),
  memberships: many(memberships),
}));

export const authSessionRelations = relations(authSessions, ({ one }) => ({
  activeOrganization: one(organizations, {
    fields: [authSessions.activeOrganizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const authAccountRelations = relations(authAccounts, ({ one }) => ({
  user: one(users, {
    fields: [authAccounts.userId],
    references: [users.id],
  }),
}));

export const membershipRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
}));

export const websiteRelations = relations(websites, ({ many, one }) => ({
  deployments: many(deployments),
  domains: many(domains),
  hostingProviderConnections: many(hostingProviderConnections),
  organization: one(organizations, {
    fields: [websites.organizationId],
    references: [organizations.id],
  }),
  projects: many(projects),
}));

export const domainRelations = relations(domains, ({ one }) => ({
  providerConnection: one(hostingProviderConnections, {
    fields: [domains.providerConnectionId],
    references: [hostingProviderConnections.id],
  }),
  organization: one(organizations, {
    fields: [domains.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [domains.websiteId],
    references: [websites.id],
  }),
}));

export const hostingProviderConnectionRelations = relations(
  hostingProviderConnections,
  ({ many, one }) => ({
    deployments: many(deployments),
    organization: one(organizations, {
      fields: [hostingProviderConnections.organizationId],
      references: [organizations.id],
    }),
    website: one(websites, {
      fields: [hostingProviderConnections.websiteId],
      references: [websites.id],
    }),
  }),
);

export const deploymentRelations = relations(deployments, ({ one }) => ({
  organization: one(organizations, {
    fields: [deployments.organizationId],
    references: [organizations.id],
  }),
  providerConnection: one(hostingProviderConnections, {
    fields: [deployments.providerConnectionId],
    references: [hostingProviderConnections.id],
  }),
  triggeredBy: one(users, {
    fields: [deployments.triggeredByUserId],
    references: [users.id],
  }),
  website: one(websites, {
    fields: [deployments.websiteId],
    references: [websites.id],
  }),
}));

export const projectRelations = relations(projects, ({ many, one }) => ({
  assignments: many(projectAssignments),
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [projects.websiteId],
    references: [websites.id],
  }),
}));

export const projectAssignmentRelations = relations(projectAssignments, ({ one }) => ({
  assignedBy: one(users, {
    fields: [projectAssignments.assignedByUserId],
    references: [users.id],
    relationName: "assignedByUser",
  }),
  organization: one(organizations, {
    fields: [projectAssignments.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectAssignments.userId],
    references: [users.id],
    relationName: "assignedProjects",
  }),
}));

export const invitationRelations = relations(invitations, ({ one }) => ({
  acceptedBy: one(users, {
    fields: [invitations.acceptedByUserId],
    references: [users.id],
    relationName: "acceptedInvitations",
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedByUserId],
    references: [users.id],
    relationName: "invitationsSent",
  }),
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));
