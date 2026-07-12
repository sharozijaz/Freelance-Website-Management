import { z } from "zod";
import { findMembershipForOrganization } from "./permissions";
import type { OrganizationMembership, SessionContext } from "./types";

export const activeOrganizationCookieName = "agency_active_organization_id";

export const activeOrganizationSchema = z.object({
  organizationId: z.uuid(),
});

export function resolveActiveOrganizationId({
  preferredOrganizationId,
  memberships,
}: {
  preferredOrganizationId?: string | null;
  memberships: OrganizationMembership[];
}): string | null {
  if (
    preferredOrganizationId &&
    findMembershipForOrganization(memberships, preferredOrganizationId)
  ) {
    return preferredOrganizationId;
  }

  return memberships.find((membership) => membership.status === "active")?.organizationId ?? null;
}

export function withActiveOrganization(
  context: Omit<SessionContext, "activeOrganizationId">,
  preferredOrganizationId?: string | null,
): SessionContext {
  const activeOrganizationId = resolveActiveOrganizationId({
    memberships: context.memberships,
    preferredOrganizationId:
      preferredOrganizationId ?? context.session.activeOrganizationId ?? null,
  });

  return {
    ...context,
    activeOrganizationId,
  };
}

export function createActiveOrganizationCookieHeader({
  maxAgeSeconds = 60 * 60 * 24 * 30,
  organizationId,
  secure = process.env.NODE_ENV === "production",
}: {
  organizationId: string;
  maxAgeSeconds?: number;
  secure?: boolean;
}): string {
  const cookieParts = [
    `${activeOrganizationCookieName}=${encodeURIComponent(organizationId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds.toString()}`,
  ];

  if (secure) {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

export function clearActiveOrganizationCookieHeader(): string {
  return `${activeOrganizationCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
