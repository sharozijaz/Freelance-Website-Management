import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import { auditLogs, invitations, memberships, organizations, users } from "@agency/database/schema";
import { PermissionDeniedError } from "./errors";
import { findMembershipForOrganization, hasPermission, type Permission } from "./permissions";
import type { MembershipRole, OrganizationMembership, SessionContext } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

export const reservedOrganizationSlugs = new Set([
  "admin",
  "agency",
  "api",
  "app",
  "auth",
  "billing",
  "cms",
  "dashboard",
  "login",
  "logout",
  "new",
  "settings",
  "support",
  "system",
]);

export const membershipRoles: MembershipRole[] = [
  "agency_owner",
  "agency_admin",
  "client_admin",
  "editor",
  "writer",
  "viewer",
];

const clientAssignableRoles: MembershipRole[] = ["editor", "writer", "viewer"];
const agencyAdminAssignableRoles: MembershipRole[] = ["client_admin", "editor", "writer", "viewer"];

export class OrganizationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationValidationError";
  }
}

export class InvitationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationValidationError";
  }
}

export interface EmailProvider {
  sendInvitation(input: {
    email: string;
    organizationName: string;
    role: MembershipRole;
    url: string;
  }): Promise<void> | void;
}

export const consoleEmailProvider: EmailProvider = {
  sendInvitation({ email, organizationName, role, url }) {
    console.info(
      `Invitation email queued for ${email} to join ${organizationName} as ${role}: ${url}`,
    );
  },
};

function isAgencyOwner(membership: OrganizationMembership): boolean {
  return membership.status === "active" && membership.role === "agency_owner";
}

function isAgencyAdmin(membership: OrganizationMembership): boolean {
  return membership.status === "active" && membership.role === "agency_admin";
}

export function hasAgencyOwnerAccess(context: SessionContext): boolean {
  return context.memberships.some(isAgencyOwner);
}

export function hasAgencyAdminAccess(context: SessionContext): boolean {
  return context.memberships.some(
    (membership) => isAgencyOwner(membership) || isAgencyAdmin(membership),
  );
}

export function normalizeOrganizationSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertValidOrganizationSlug(slug: string): void {
  if (!slug) {
    throw new OrganizationValidationError("Organization slug is required.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new OrganizationValidationError(
      "Organization slug must use lowercase letters, numbers, and hyphens.",
    );
  }

  if (reservedOrganizationSlugs.has(slug)) {
    throw new OrganizationValidationError(`"${slug}" is a reserved organization slug.`);
  }
}

function getActorMembership(
  context: SessionContext,
  organizationId: string,
): OrganizationMembership | null {
  return findMembershipForOrganization(context.memberships, organizationId) ?? null;
}

function canAssignRole(actor: OrganizationMembership | null, role: MembershipRole): boolean {
  if (actor?.status !== "active") {
    return false;
  }

  if (actor.role === "agency_owner") {
    return true;
  }

  if (actor.role === "agency_admin") {
    return agencyAdminAssignableRoles.includes(role);
  }

  if (actor.role === "client_admin") {
    return clientAssignableRoles.includes(role);
  }

  return false;
}

export function assertCanAssignRole(
  actor: OrganizationMembership | null,
  role: MembershipRole,
): void {
  if (!canAssignRole(actor, role)) {
    throw new PermissionDeniedError("You cannot assign that role.");
  }
}

export function assertCanManageMembers(
  context: SessionContext,
  organizationId: string,
  permission: Permission = "users:manage",
): OrganizationMembership {
  const membership = getActorMembership(context, organizationId);

  if (!membership || !hasPermission(membership, permission)) {
    throw new PermissionDeniedError();
  }

  return membership;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

async function writeAuditLog({
  action,
  actorUserId,
  database,
  metadata = {},
  organizationId,
  resourceId,
  resourceType,
}: {
  action: string;
  actorUserId?: string | null;
  database: Database;
  metadata?: Record<string, unknown>;
  organizationId: string;
  resourceId?: string | null;
  resourceType: string;
}): Promise<void> {
  await database.insert(auditLogs).values({
    action,
    actorUserId,
    metadata,
    organizationId,
    resourceId,
    resourceType,
  });
}

async function assertNotFinalAgencyOwner({
  database,
  membershipId,
}: {
  database: Database;
  membershipId: string;
}): Promise<void> {
  const membership = await database.query.memberships.findFirst({
    where: eq(memberships.id, membershipId),
    columns: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (membership?.role !== "agency_owner" || membership.status !== "active") {
    return;
  }

  const [result] = await database
    .select({ value: count() })
    .from(memberships)
    .where(
      and(
        eq(memberships.role, "agency_owner"),
        eq(memberships.status, "active"),
        isNull(memberships.deletedAt),
        ne(memberships.id, membershipId),
      ),
    );

  if (!result || result.value < 1) {
    throw new OrganizationValidationError("Cannot modify or remove the final Agency Owner.");
  }
}

export async function listAccessibleOrganizations({
  context,
  database,
}: {
  context: SessionContext;
  database: Database;
}) {
  if (hasAgencyOwnerAccess(context)) {
    return database.query.organizations.findMany({
      where: and(eq(organizations.status, "active"), isNull(organizations.deletedAt)),
      orderBy: (table, { asc }) => [asc(table.name)],
    });
  }

  const activeOrganizationIds = context.memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.organizationId);

  if (activeOrganizationIds.length === 0) {
    return [];
  }

  const rows = await database.query.organizations.findMany({
    where: and(eq(organizations.status, "active"), isNull(organizations.deletedAt)),
    orderBy: (table, { asc }) => [asc(table.name)],
  });

  return rows.filter((organization) => activeOrganizationIds.includes(organization.id));
}

export async function createOrganization({
  context,
  database,
  input,
}: {
  context: SessionContext;
  database: Database;
  input: {
    contactEmail?: string;
    contactName?: string;
    locale?: string;
    logoUrl?: string;
    name: string;
    slug?: string;
    timezone?: string;
  };
}) {
  if (!hasAgencyAdminAccess(context)) {
    throw new PermissionDeniedError("Only agency users can create organizations.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    throw new OrganizationValidationError("Organization name must be at least 2 characters.");
  }

  const slug = normalizeOrganizationSlug(input.slug ?? name);
  assertValidOrganizationSlug(slug);

  const existing = await database.query.organizations.findFirst({
    where: and(eq(organizations.slug, slug), isNull(organizations.deletedAt)),
    columns: { id: true },
  });

  if (existing) {
    throw new OrganizationValidationError(`Organization slug "${slug}" is already in use.`);
  }

  const [organization] = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(organizations)
      .values({
        locale: input.locale ?? "en",
        metadata: {
          contactEmail: input.contactEmail,
          contactName: input.contactName,
          logoUrl: input.logoUrl,
        },
        name,
        slug,
        timezone: input.timezone ?? "UTC",
      })
      .returning();

    if (!created) {
      throw new OrganizationValidationError("Organization could not be created.");
    }

    await tx.insert(memberships).values({
      acceptedAt: new Date(),
      organizationId: created.id,
      permissions: [],
      role: hasAgencyOwnerAccess(context) ? "agency_owner" : "agency_admin",
      status: "active",
      userId: context.user.id,
    });

    await tx.insert(auditLogs).values({
      action: "organization.created",
      actorUserId: context.user.id,
      metadata: { slug },
      organizationId: created.id,
      resourceId: created.id,
      resourceType: "organization",
    });

    return [created];
  });

  return organization;
}

export async function archiveOrganization({
  context,
  database,
  organizationId,
}: {
  context: SessionContext;
  database: Database;
  organizationId: string;
}) {
  if (!hasAgencyAdminAccess(context)) {
    throw new PermissionDeniedError("Only agency users can archive client workspaces.");
  }

  const organization = await database.query.organizations.findFirst({
    where: and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)),
  });

  if (!organization) {
    throw new OrganizationValidationError("Client workspace was not found.");
  }

  const [activeCount] = await database
    .select({ value: count() })
    .from(organizations)
    .where(and(eq(organizations.status, "active"), isNull(organizations.deletedAt)));

  if (!activeCount || activeCount.value <= 1) {
    throw new OrganizationValidationError("Cannot archive the final active client workspace.");
  }

  const now = new Date();
  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(organizations)
      .set({
        deletedAt: now,
        status: "archived",
        updatedAt: now,
      })
      .where(eq(organizations.id, organization.id))
      .returning();

    if (!row) {
      throw new OrganizationValidationError("Client workspace could not be archived.");
    }

    await tx.insert(auditLogs).values({
      action: "organization.archived",
      actorUserId: context.user.id,
      metadata: { slug: organization.slug },
      organizationId: organization.id,
      resourceId: organization.id,
      resourceType: "organization",
    });

    return [row];
  });

  return updated;
}

export async function permanentlyDeleteOrganization({
  confirmation,
  context,
  database,
  organizationId,
}: {
  confirmation: string;
  context: SessionContext;
  database: Database;
  organizationId: string;
}) {
  if (!hasAgencyAdminAccess(context)) {
    throw new PermissionDeniedError("Only agency users can permanently delete client workspaces.");
  }

  if (context.activeOrganizationId === organizationId) {
    throw new OrganizationValidationError(
      "Switch to another workspace before permanently deleting this client.",
    );
  }

  const organization = await database.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    throw new OrganizationValidationError("Client workspace was not found.");
  }

  if (organization.status !== "archived" || !organization.deletedAt) {
    throw new OrganizationValidationError("Archive this client before permanently deleting it.");
  }

  const normalizedConfirmation = confirmation.trim();
  if (
    normalizedConfirmation !== organization.slug &&
    normalizedConfirmation !== organization.name
  ) {
    throw new OrganizationValidationError(
      `Type "${organization.slug}" to permanently delete this client.`,
    );
  }

  const [activeCount] = await database
    .select({ value: count() })
    .from(organizations)
    .where(and(eq(organizations.status, "active"), isNull(organizations.deletedAt)));

  if (!activeCount || activeCount.value < 1) {
    throw new OrganizationValidationError("Cannot delete the final active workspace.");
  }

  const [deleted] = await database
    .delete(organizations)
    .where(eq(organizations.id, organization.id))
    .returning({ id: organizations.id });

  if (!deleted) {
    throw new OrganizationValidationError("Client workspace could not be permanently deleted.");
  }

  return deleted;
}

export async function switchActiveOrganization({
  context,
  database,
  organizationId,
}: {
  context: SessionContext;
  database: Database;
  organizationId: string;
}) {
  const organizationsForUser = await listAccessibleOrganizations({ context, database });
  const organization = organizationsForUser.find((item) => item.id === organizationId);

  if (!organization) {
    throw new PermissionDeniedError("You cannot access that organization.");
  }

  await writeAuditLog({
    action: "organization.switched",
    actorUserId: context.user.id,
    database,
    organizationId,
    resourceId: organizationId,
    resourceType: "organization",
  });

  return organization;
}

export async function listOrganizationMembers({
  context,
  database,
  organizationId,
}: {
  context: SessionContext;
  database: Database;
  organizationId: string;
}) {
  assertCanManageMembers(context, organizationId, "organization:read");

  return database.query.memberships.findMany({
    where: and(eq(memberships.organizationId, organizationId), isNull(memberships.deletedAt)),
    with: { user: true },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
}

export async function updateMembershipRole({
  context,
  database,
  membershipId,
  role,
}: {
  context: SessionContext;
  database: Database;
  membershipId: string;
  role: MembershipRole;
}) {
  const target = await database.query.memberships.findFirst({
    where: eq(memberships.id, membershipId),
  });

  if (!target) {
    throw new OrganizationValidationError("Membership was not found.");
  }

  const actor = assertCanManageMembers(context, target.organizationId);
  assertCanAssignRole(actor, role);
  await assertNotFinalAgencyOwner({ database, membershipId });

  const [updated] = await database
    .update(memberships)
    .set({ role, updatedAt: new Date() })
    .where(eq(memberships.id, membershipId))
    .returning();

  await writeAuditLog({
    action: "membership.role_changed",
    actorUserId: context.user.id,
    database,
    metadata: { from: target.role, to: role },
    organizationId: target.organizationId,
    resourceId: membershipId,
    resourceType: "membership",
  });

  return updated;
}

export async function setMembershipStatus({
  context,
  database,
  membershipId,
  status,
}: {
  context: SessionContext;
  database: Database;
  membershipId: string;
  status: "active" | "disabled" | "removed";
}) {
  const target = await database.query.memberships.findFirst({
    where: eq(memberships.id, membershipId),
  });

  if (!target) {
    throw new OrganizationValidationError("Membership was not found.");
  }

  assertCanManageMembers(context, target.organizationId);
  await assertNotFinalAgencyOwner({ database, membershipId });

  if (target.userId === context.user.id && status !== "active") {
    throw new PermissionDeniedError("You cannot suspend or remove your own membership.");
  }

  const now = new Date();
  const [updated] = await database
    .update(memberships)
    .set({
      deletedAt: status === "removed" ? now : null,
      disabledAt: status === "disabled" ? now : null,
      status,
      updatedAt: now,
    })
    .where(eq(memberships.id, membershipId))
    .returning();

  await writeAuditLog({
    action:
      status === "active"
        ? "membership.reactivated"
        : status === "disabled"
          ? "membership.suspended"
          : "membership.removed",
    actorUserId: context.user.id,
    database,
    organizationId: target.organizationId,
    resourceId: membershipId,
    resourceType: "membership",
  });

  return updated;
}

export async function createInvitation({
  acceptBaseUrl,
  context,
  database,
  emailProvider = consoleEmailProvider,
  input,
}: {
  acceptBaseUrl: string;
  context: SessionContext;
  database: Database;
  emailProvider?: EmailProvider;
  input: {
    email: string;
    expiresInDays?: number;
    organizationId: string;
    role: MembershipRole;
  };
}) {
  const actor = assertCanManageMembers(context, input.organizationId, "users:invite");
  assertCanAssignRole(actor, input.role);

  const organization = await database.query.organizations.findFirst({
    where: and(eq(organizations.id, input.organizationId), isNull(organizations.deletedAt)),
  });

  if (!organization) {
    throw new OrganizationValidationError("Organization was not found.");
  }

  const token = createInvitationToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000);
  const email = input.email.trim().toLowerCase();

  const [invitation] = await database
    .insert(invitations)
    .values({
      email,
      expiresAt,
      invitedByUserId: context.user.id,
      organizationId: input.organizationId,
      role: input.role,
      status: "pending",
      tokenHash,
    })
    .returning();

  if (!invitation) {
    throw new InvitationValidationError("Invitation could not be created.");
  }

  await writeAuditLog({
    action: "invitation.created",
    actorUserId: context.user.id,
    database,
    metadata: { email, role: input.role },
    organizationId: input.organizationId,
    resourceId: invitation.id,
    resourceType: "invitation",
  });

  const url = `${acceptBaseUrl.replace(/\/$/, "")}/invite/${token}`;
  await emailProvider.sendInvitation({
    email,
    organizationName: organization.name,
    role: input.role,
    url,
  });

  return { invitation, token, url };
}

export async function revokeInvitation({
  context,
  database,
  invitationId,
}: {
  context: SessionContext;
  database: Database;
  invitationId: string;
}) {
  const invitation = await database.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
  });

  if (!invitation) {
    throw new InvitationValidationError("Invitation was not found.");
  }

  assertCanManageMembers(context, invitation.organizationId, "users:invite");

  const [updated] = await database
    .update(invitations)
    .set({ revokedAt: new Date(), status: "revoked", updatedAt: new Date() })
    .where(eq(invitations.id, invitationId))
    .returning();

  await writeAuditLog({
    action: "invitation.revoked",
    actorUserId: context.user.id,
    database,
    organizationId: invitation.organizationId,
    resourceId: invitation.id,
    resourceType: "invitation",
  });

  return updated;
}

export async function acceptInvitation({
  database,
  input,
}: {
  database: Database;
  input: {
    email?: string;
    name?: string;
    token: string;
    userId?: string;
  };
}) {
  const tokenHash = hashToken(input.token);
  const invitation = await database.query.invitations.findFirst({
    where: eq(invitations.tokenHash, tokenHash),
  });

  if (!invitation) {
    throw new InvitationValidationError("Invitation is invalid.");
  }

  if (invitation.status === "accepted" || invitation.acceptedAt) {
    throw new InvitationValidationError("Invitation has already been accepted.");
  }

  if (invitation.status === "revoked" || invitation.revokedAt) {
    throw new InvitationValidationError("Invitation has been revoked.");
  }

  if (invitation.expiresAt < new Date()) {
    await database
      .update(invitations)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
    throw new InvitationValidationError("Invitation has expired.");
  }

  const email = (input.email ?? invitation.email).trim().toLowerCase();

  if (email !== invitation.email) {
    throw new InvitationValidationError("Invitation email does not match.");
  }

  return database.transaction(async (tx) => {
    let userId = input.userId;

    if (!userId) {
      const existing = await tx.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existing) {
        userId = existing.id;
      } else {
        const [createdUser] = await tx
          .insert(users)
          .values({
            email,
            name: input.name ?? null,
            status: "active",
          })
          .returning();

        if (!createdUser) {
          throw new InvitationValidationError("User could not be created.");
        }

        userId = createdUser.id;
      }
    }

    const [membership] = await tx
      .insert(memberships)
      .values({
        acceptedAt: new Date(),
        organizationId: invitation.organizationId,
        permissions: [],
        role: invitation.role,
        status: "active",
        userId,
      })
      .onConflictDoUpdate({
        set: {
          acceptedAt: new Date(),
          deletedAt: null,
          disabledAt: null,
          role: invitation.role,
          status: "active",
          updatedAt: new Date(),
        },
        target: [memberships.organizationId, memberships.userId],
      })
      .returning();

    const [acceptedInvitation] = await tx
      .update(invitations)
      .set({
        acceptedAt: new Date(),
        acceptedByUserId: userId,
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(and(eq(invitations.id, invitation.id), eq(invitations.status, "pending")))
      .returning();

    if (!acceptedInvitation) {
      throw new InvitationValidationError("Invitation can no longer be accepted.");
    }

    await tx.insert(auditLogs).values({
      action: "invitation.accepted",
      actorUserId: userId,
      metadata: { email: invitation.email, role: invitation.role },
      organizationId: invitation.organizationId,
      resourceId: invitation.id,
      resourceType: "invitation",
    });

    return { invitation: acceptedInvitation, membership, userId };
  });
}
