import { AuthRequiredError, OrganizationRequiredError, PermissionDeniedError } from "./errors";
import { findMembershipForOrganization, hasPermission, type Permission } from "./permissions";
import type { OrganizationMembership, SessionContext } from "./types";

export function requireSession(context: SessionContext | null | undefined): SessionContext {
  if (!context) {
    throw new AuthRequiredError();
  }

  return context;
}

export function requireActiveOrganization(context: SessionContext): string {
  if (!context.activeOrganizationId) {
    throw new OrganizationRequiredError();
  }

  return context.activeOrganizationId;
}

export function requireMembership(
  context: SessionContext,
  organizationId = requireActiveOrganization(context),
): OrganizationMembership {
  const membership = findMembershipForOrganization(context.memberships, organizationId);

  if (!membership) {
    throw new OrganizationRequiredError("The current user is not a member of this organization.");
  }

  return membership;
}

export function requirePermission(
  context: SessionContext,
  permission: Permission,
  organizationId = requireActiveOrganization(context),
): OrganizationMembership {
  const membership = requireMembership(context, organizationId);

  if (!hasPermission(membership, permission)) {
    throw new PermissionDeniedError();
  }

  return membership;
}
