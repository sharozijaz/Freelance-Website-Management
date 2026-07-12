import { describe, expect, it } from "vitest";
import { tenantReadAccess, tenantWriteAccess } from "./index";

describe("CMS tenant access", () => {
  it("scopes client reads to the active organization", () => {
    const access = tenantReadAccess("cms:read");

    expect(
      access({
        req: {
          user: {
            activeOrganizationId: "org_1",
            memberships: [
              {
                organizationId: "org_1",
                permissions: [],
                role: "client_admin",
                status: "active",
                userId: "user_1",
              },
            ],
          },
        },
      } as never),
    ).toEqual({
      organizationId: {
        equals: "org_1",
      },
    });
  });

  it("fails closed without an active organization", () => {
    const access = tenantReadAccess("cms:read");

    expect(
      access({
        req: {
          user: {
            memberships: [],
          },
        },
      } as never),
    ).toBe(false);
  });

  it("allows agency owners to read across organizations", () => {
    const access = tenantReadAccess("cms:read");

    expect(
      access({
        req: {
          user: {
            memberships: [
              {
                organizationId: "agency",
                permissions: [],
                role: "agency_owner",
                status: "active",
                userId: "user_1",
              },
            ],
          },
        },
      } as never),
    ).toBe(true);
  });

  it("prevents writes into another active organization", () => {
    const access = tenantWriteAccess("cms:write");

    expect(
      access({
        data: {
          organizationId: "org_2",
        },
        req: {
          user: {
            activeOrganizationId: "org_1",
            memberships: [
              {
                organizationId: "org_1",
                permissions: [],
                role: "client_admin",
                status: "active",
                userId: "user_1",
              },
            ],
          },
        },
      } as never),
    ).toBe(false);
  });
});
