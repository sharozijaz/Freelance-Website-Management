import type { MembershipRole, OrganizationMembership } from "./types";

export const permissions = [
  "organization:read",
  "organization:update",
  "users:invite",
  "users:manage",
  "projects:read",
  "projects:manage",
  "websites:read",
  "websites:manage",
  "modules:read",
  "modules:manage",
  "developer:credentials",
  "deployments:read",
  "deployments:trigger",
  "hosting:manage",
  "provider_credentials:manage",
  "domains:read",
  "domains:manage",
  "cms:read",
  "cms:write",
  "cms:publish",
  "blog:read",
  "blog:create",
  "blog:update",
  "blog:publish",
  "blog:delete",
  "media:manage",
  "forms:read",
  "forms:manage",
  "seo:manage",
  "analytics:read",
  "settings:manage",
  "audit:read",
  "billing:manage",
] as const;

export type Permission = (typeof permissions)[number];

const allPermissions = [...permissions];

export const rolePermissions = {
  agency_owner: allPermissions,
  agency_admin: allPermissions.filter((permission) => permission !== "billing:manage"),
  client_admin: [
    "organization:read",
    "users:invite",
    "projects:read",
    "websites:read",
    "websites:manage",
    "modules:read",
    "modules:manage",
    "deployments:read",
    "deployments:trigger",
    "hosting:manage",
    "domains:read",
    "domains:manage",
    "cms:read",
    "cms:write",
    "cms:publish",
    "blog:read",
    "blog:create",
    "blog:update",
    "blog:publish",
    "blog:delete",
    "media:manage",
    "forms:read",
    "forms:manage",
    "seo:manage",
    "analytics:read",
    "settings:manage",
  ],
  editor: [
    "organization:read",
    "projects:read",
    "websites:read",
    "modules:read",
    "deployments:read",
    "domains:read",
    "cms:read",
    "cms:write",
    "cms:publish",
    "blog:read",
    "blog:create",
    "blog:update",
    "blog:publish",
    "media:manage",
    "forms:read",
    "seo:manage",
  ],
  writer: [
    "organization:read",
    "projects:read",
    "websites:read",
    "modules:read",
    "deployments:read",
    "domains:read",
    "cms:read",
    "cms:write",
    "blog:read",
    "blog:create",
    "blog:update",
  ],
  viewer: [
    "organization:read",
    "projects:read",
    "websites:read",
    "modules:read",
    "deployments:read",
    "domains:read",
    "cms:read",
    "blog:read",
    "forms:read",
    "analytics:read",
  ],
} satisfies Record<MembershipRole, Permission[]>;

export function isPermission(value: string): value is Permission {
  return permissions.includes(value as Permission);
}

export function getRolePermissions(role: MembershipRole): Permission[] {
  return rolePermissions[role];
}

export function getEffectivePermissions(membership: OrganizationMembership): Permission[] {
  const explicitPermissions = membership.permissions.filter(isPermission);
  return Array.from(new Set([...getRolePermissions(membership.role), ...explicitPermissions]));
}

export function hasPermission(
  membership: OrganizationMembership | null | undefined,
  permission: Permission,
): boolean {
  if (membership?.status !== "active") {
    return false;
  }

  return getEffectivePermissions(membership).includes(permission);
}

export function hasAnyPermission(
  membership: OrganizationMembership | null | undefined,
  requestedPermissions: Permission[],
): boolean {
  return requestedPermissions.some((permission) => hasPermission(membership, permission));
}

export function hasEveryPermission(
  membership: OrganizationMembership | null | undefined,
  requestedPermissions: Permission[],
): boolean {
  return requestedPermissions.every((permission) => hasPermission(membership, permission));
}

export function findMembershipForOrganization(
  memberships: OrganizationMembership[],
  organizationId: string,
): OrganizationMembership | undefined {
  return memberships.find(
    (membership) => membership.organizationId === organizationId && membership.status === "active",
  );
}
