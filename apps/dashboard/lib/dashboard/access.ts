import { PermissionDeniedError } from "@agency/auth";
import {
  findMembershipForOrganization,
  hasPermission,
  type Permission,
} from "@agency/auth/permissions";
import { hasAgencyAdminAccess, hasAgencyOwnerAccess } from "@agency/auth/organizations";
import type { SessionContext } from "@agency/auth";
import type { DashboardAccess, DashboardRequest } from "./types";

export function getDashboardAccess(context: SessionContext): DashboardAccess {
  const activeOrganizationId = context.activeOrganizationId ?? null;
  const activeMembership = activeOrganizationId
    ? findMembershipForOrganization(context.memberships, activeOrganizationId)
    : null;
  const isAgencyUser = hasAgencyAdminAccess(context);

  return {
    activeOrganizationId,
    canManageMembers: hasPermission(activeMembership, "users:manage"),
    canReadAudit: hasPermission(activeMembership, "audit:read") || hasAgencyOwnerAccess(context),
    canReadContent: hasPermission(activeMembership, "cms:read"),
    canReadWebsites: hasPermission(activeMembership, "websites:read"),
    canWriteContent: hasPermission(activeMembership, "cms:write"),
    isAgencyUser,
    role: activeMembership?.role ?? (isAgencyUser ? "agency" : "viewer"),
    workspaceMode: activeOrganizationId ? "client" : "agency",
  };
}

export function createDashboardRequest(context: SessionContext): DashboardRequest {
  return {
    access: getDashboardAccess(context),
    context,
  };
}

export function assertDashboardPermission(
  request: DashboardRequest,
  permission: Permission,
  organizationId = request.access.activeOrganizationId,
) {
  if (hasAgencyOwnerAccess(request.context)) {
    return;
  }

  if (!organizationId) {
    const hasScopedPermission = request.context.memberships.some((membership) =>
      hasPermission(membership, permission),
    );

    if (hasScopedPermission) {
      return;
    }

    throw new PermissionDeniedError("An active organization is required.");
  }

  const membership = findMembershipForOrganization(request.context.memberships, organizationId);
  if (!hasPermission(membership, permission)) {
    throw new PermissionDeniedError();
  }
}

export function assertAgencyOperationsAccess(request: DashboardRequest) {
  if (!request.access.isAgencyUser) {
    throw new PermissionDeniedError("Agency operations require an agency role.");
  }
}

export function getScopedOrganizationIds(request: DashboardRequest): string[] | null {
  if (hasAgencyOwnerAccess(request.context)) {
    return null;
  }

  return request.context.memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.organizationId);
}
