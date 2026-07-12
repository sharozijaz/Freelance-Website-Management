import { describe, expect, it } from "vitest";
import { PermissionDeniedError } from "./errors";
import {
  assertCanAssignRole,
  assertValidOrganizationSlug,
  createInvitationToken,
  hasAgencyOwnerAccess,
  normalizeOrganizationSlug,
  OrganizationValidationError,
} from "./organizations";
import type { OrganizationMembership, SessionContext } from "./types";

function membership(role: OrganizationMembership["role"]): OrganizationMembership {
  return {
    organizationId: "org_1",
    permissions: [],
    role,
    status: "active",
    userId: "user_1",
  };
}

function context(role: OrganizationMembership["role"]): SessionContext {
  return {
    activeOrganizationId: "org_1",
    memberships: [membership(role)],
    session: {
      expiresAt: new Date(),
      id: "session_1",
      userId: "user_1",
    },
    user: {
      email: "owner@example.com",
      emailVerified: true,
      id: "user_1",
      image: null,
      name: "Owner",
    },
  };
}

describe("organization workspace authorization", () => {
  it("detects agency owner platform access", () => {
    expect(hasAgencyOwnerAccess(context("agency_owner"))).toBe(true);
    expect(hasAgencyOwnerAccess(context("client_admin"))).toBe(false);
  });

  it("prevents client admins from assigning agency roles", () => {
    expect(() => {
      assertCanAssignRole(membership("client_admin"), "agency_admin");
    }).toThrow(PermissionDeniedError);
    expect(() => {
      assertCanAssignRole(membership("client_admin"), "editor");
    }).not.toThrow();
  });

  it("prevents agency admins from escalating users to agency owner", () => {
    expect(() => {
      assertCanAssignRole(membership("agency_admin"), "agency_owner");
    }).toThrow(PermissionDeniedError);
    expect(() => {
      assertCanAssignRole(membership("agency_admin"), "client_admin");
    }).not.toThrow();
  });

  it("normalizes and validates organization slugs", () => {
    expect(normalizeOrganizationSlug(" Client A, Inc. ")).toBe("client-a-inc");
    expect(() => {
      assertValidOrganizationSlug("dashboard");
    }).toThrow(OrganizationValidationError);
    expect(() => {
      assertValidOrganizationSlug("client-a");
    }).not.toThrow();
  });

  it("generates high entropy invitation tokens", () => {
    const first = createInvitationToken();
    const second = createInvitationToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(32);
  });
});
