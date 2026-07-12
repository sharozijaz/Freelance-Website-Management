import { describe, expect, it } from "vitest";
import { createPreviewToken, verifyPreviewToken } from "./preview";

describe("preview token signing", () => {
  it("verifies a valid tenant-scoped preview token", () => {
    const token = createPreviewToken({
      organizationId: "org_123",
      path: "/services",
      secret: "secret",
    });

    expect(verifyPreviewToken(token, "secret")).toMatchObject({
      organizationId: "org_123",
      path: "/services",
    });
  });

  it("rejects a token signed with another secret", () => {
    const token = createPreviewToken({
      organizationId: "org_123",
      path: "/services",
      secret: "secret",
    });

    expect(verifyPreviewToken(token, "different-secret")).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = createPreviewToken({
      organizationId: "org_123",
      path: "/services",
      secret: "secret",
      ttlSeconds: -1,
    });

    expect(verifyPreviewToken(token, "secret")).toBeNull();
  });
});
