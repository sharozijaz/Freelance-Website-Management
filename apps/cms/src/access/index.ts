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
  role?: string | null;
}

interface TenantDocument {
  organizationId?: string | null;
}

function getCmsUser(req: PayloadRequest): CmsUser | null {
  const user: CmsUser | null | undefined = req.user;

  return user ?? null;
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

export function isCmsAdmin(req: PayloadRequest): boolean {
  return getCmsUser(req)?.role === "cms_admin";
}

export function can(permission: Permission): Access {
  return ({ req }) => isCmsAdmin(req) || hasPermission(getActiveMembership(req), permission);
}

export const publicRead: Access = () => true;

export const publishedPageRead: Access = ({ req }): boolean | Where => {
  if (isCmsAdmin(req) || getActiveMembership(req)) {
    return true;
  }

  return {
    or: [
      {
        _status: {
          equals: "published",
        },
      },
      {
        workflowStatus: {
          equals: "published",
        },
      },
    ],
  };
};

export const publishedPostRead: Access = ({ req }): boolean | Where => {
  if (isCmsAdmin(req) || getActiveMembership(req)) {
    return true;
  }

  return {
    _status: {
      equals: "published",
    },
  };
};

export function tenantReadAccess(permission: Permission): Access {
  return ({ req }): boolean | Where => {
    const organizationId = getActiveOrganizationId(req);
    const user = getCmsUser(req);
    const membership = getActiveMembership(req);

    if (isCmsAdmin(req)) {
      return true;
    }

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

    if (isCmsAdmin(req)) {
      return true;
    }

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
  read: publicRead,
  update: tenantWriteAccess("cms:write"),
};

export const publishedPageAccess = {
  create: tenantWriteAccess("cms:write"),
  delete: can("cms:publish"),
  read: publishedPageRead,
  update: tenantWriteAccess("cms:write"),
};

export const publishedPostAccess = {
  create: tenantWriteAccess("cms:write"),
  delete: can("cms:publish"),
  read: publishedPostRead,
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
  read: publicRead,
  update: tenantWriteAccess("media:manage"),
};

export const settingsAccess = {
  read: publicRead,
  update: can("settings:manage"),
};
