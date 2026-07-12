import { describe, expect, it } from "vitest";
import {
  BootstrapAlreadyCompletedError,
  assertBootstrapAllowed,
  bootstrapOwnerInputSchema,
  createOrganizationSlug,
} from "./bootstrap";

describe("owner bootstrap helpers", () => {
  it("validates the first owner input", () => {
    const input = bootstrapOwnerInputSchema.parse({
      email: "OWNER@Example.com",
      name: "Agency Owner",
      organizationName: "Agency Platform",
      password: "long-enough-password",
    });

    expect(input.email).toBe("owner@example.com");
  });

  it("rejects weak bootstrap passwords", () => {
    expect(() =>
      bootstrapOwnerInputSchema.parse({
        email: "owner@example.com",
        name: "Agency Owner",
        organizationName: "Agency Platform",
        password: "short",
      }),
    ).toThrow();
  });

  it("prevents duplicate owner bootstrap", () => {
    expect(() => {
      assertBootstrapAllowed(1);
    }).toThrow(BootstrapAlreadyCompletedError);
    expect(() => {
      assertBootstrapAllowed(0);
    }).not.toThrow();
  });

  it("creates stable organization slugs", () => {
    expect(createOrganizationSlug("Agency Platform, LLC")).toBe("agency-platform-llc");
    expect(createOrganizationSlug("!!!")).toBe("agency-platform");
  });
});
