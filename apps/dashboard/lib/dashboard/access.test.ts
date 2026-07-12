import { describe, expect, it } from "vitest";
import { PermissionDeniedError } from "@agency/auth";
import type { SessionContext } from "@agency/auth";
import {
  assertAgencyOperationsAccess,
  assertDashboardPermission,
  createDashboardRequest,
  getScopedOrganizationIds,
} from "./access";

const baseContext: SessionContext = {
  activeOrganizationId: "org_1",
  memberships: [],
  session: { expiresAt: new Date(), id: "session_1", userId: "user_1" },
  user: { email: "owner@example.com", id: "user_1", name: "Owner" },
};

describe("dashboard access", () => {
  it("allows agency owners to access agency operations and all organization scopes", () => {
    const request = createDashboardRequest({
      ...baseContext,
      memberships: [
        {
          organizationId: "agency",
          permissions: [],
          role: "agency_owner",
          status: "active",
          userId: "user_1",
        },
      ],
    });

    expect(() => {
      assertAgencyOperationsAccess(request);
    }).not.toThrow();
    expect(getScopedOrganizationIds(request)).toBeNull();
  });

  it("denies agency overview to client users", () => {
    const request = createDashboardRequest({
      ...baseContext,
      memberships: [
        {
          organizationId: "org_1",
          permissions: [],
          role: "client_admin",
          status: "active",
          userId: "user_1",
        },
      ],
    });

    expect(() => {
      assertAgencyOperationsAccess(request);
    }).toThrow(PermissionDeniedError);
  });

  it("enforces organization-aware permissions", () => {
    const request = createDashboardRequest({
      ...baseContext,
      memberships: [
        {
          organizationId: "org_1",
          permissions: [],
          role: "viewer",
          status: "active",
          userId: "user_1",
        },
      ],
    });

    expect(() => {
      assertDashboardPermission(request, "websites:read", "org_1");
    }).not.toThrow();
    expect(() => {
      assertDashboardPermission(request, "users:manage", "org_1");
    }).toThrow(PermissionDeniedError);
  });

  it("allows client admins to manage client-scoped websites but not agency operations", () => {
    const request = createDashboardRequest({
      ...baseContext,
      memberships: [
        {
          organizationId: "org_1",
          permissions: [],
          role: "client_admin",
          status: "active",
          userId: "user_1",
        },
      ],
    });

    expect(() => {
      assertDashboardPermission(request, "websites:manage", "org_1");
    }).not.toThrow();
    expect(() => {
      assertAgencyOperationsAccess(request);
    }).toThrow(PermissionDeniedError);
  });

  it("limits editors to content-oriented write access", () => {
    const request = createDashboardRequest({
      ...baseContext,
      memberships: [
        {
          organizationId: "org_1",
          permissions: [],
          role: "editor",
          status: "active",
          userId: "user_1",
        },
      ],
    });

    expect(() => {
      assertDashboardPermission(request, "cms:write", "org_1");
    }).not.toThrow();
    expect(() => {
      assertDashboardPermission(request, "users:manage", "org_1");
    }).toThrow(PermissionDeniedError);
  });

  it("keeps viewers read-only on protected server permissions", () => {
    const request = createDashboardRequest({
      ...baseContext,
      memberships: [
        {
          organizationId: "org_1",
          permissions: [],
          role: "viewer",
          status: "active",
          userId: "user_1",
        },
      ],
    });

    expect(() => {
      assertDashboardPermission(request, "cms:read", "org_1");
    }).not.toThrow();
    expect(() => {
      assertDashboardPermission(request, "cms:write", "org_1");
    }).toThrow(PermissionDeniedError);
  });
});
