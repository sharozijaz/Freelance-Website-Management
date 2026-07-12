import type { Access, PayloadRequest, Where } from "payload";
import {
  findMembershipForOrganization,
  hasPermission,
  type Permission,
} from "@agency/auth/permissions";
import type { OrganizationMembership } from "@agency/auth";

interface CmsUser {
  activeOrganizationId?: string | null;
  memberships?: OrganizationMembership[];
}

interface TenantDocument {
  organizationId?: string | null;
}

function getCmsUser(req: PayloadRequest): CmsUser | null {
  return (req.user as CmsUser | null | undefined) ?? null;
}

export function getActiveOrganizationId(req: PayloadRequest): string | null {
  const user = getCmsUser(req);
  return user?.activeOrganizationId ?? null;
}

export function getActiveMembership(req: PayloadRequest): OrganizationMembership | null {
  const user = getCmsUser(req);
  const organizationId = getActiveOrganizationId(req);

  if (!user?.memberships || !organizationId) {
    return null;
  }

  return findMembershipForOrganization(user.memberships, organizationId) ?? null;
}

export function can(permission: Permission): Access {
  return ({ req }) => hasPermission(getActiveMembership(req), permission);
}

export function tenantReadAccess(permission: Permission): Access {
  return ({ req }): boolean | Where => {
    const organizationId = getActiveOrganizationId(req);
    const user = getCmsUser(req);
    const membership = getActiveMembership(req);

    if (
      user?.memberships?.some((item) => item.status === "active" && item.role === "agency_owner")
    ) {
      return true;
    }

    if (!organizationId || !hasPermission(membership, permission)) {
      return false;
    }

    return {
      organizationId: {
        equals: organizationId,
      },
    };
  };
}

export function tenantWriteAccess(permission: Permission): Access<TenantDocument> {
  return ({ data, req }): boolean => {
    const organizationId = getActiveOrganizationId(req);
    const membership = getActiveMembership(req);

    if (!organizationId || !hasPermission(membership, permission)) {
      return false;
    }

    if (data?.organizationId && data.organizationId !== organizationId) {
      return false;
    }

    return true;
  };
}

export const contentAccess = {
  create: tenantWriteAccess("cms:write"),
  delete: can("cms:publish"),
  read: tenantReadAccess("cms:read"),
  update: tenantWriteAccess("cms:write"),
};

export const publishAccess = {
  create: tenantWriteAccess("cms:publish"),
  delete: can("cms:publish"),
  read: tenantReadAccess("cms:read"),
  update: tenantWriteAccess("cms:publish"),
};

export const mediaAccess = {
  create: tenantWriteAccess("media:manage"),
  delete: can("media:manage"),
  read: tenantReadAccess("cms:read"),
  update: tenantWriteAccess("media:manage"),
};

export const settingsAccess = {
  read: tenantReadAccess("settings:manage"),
  update: can("settings:manage"),
};
