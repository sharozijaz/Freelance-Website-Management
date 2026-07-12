import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPageBySlug } from "./queries";
import { findFirstPayloadDoc } from "./client";

vi.mock("./client", () => ({
  findFirstPayloadDoc: vi.fn(),
  findPayloadDocs: vi.fn(),
}));

describe("tenant-scoped page queries", () => {
  beforeEach(() => {
    vi.mocked(findFirstPayloadDoc).mockResolvedValue(null);
  });

  it("does not query Payload without an organization scope", async () => {
    await expect(getPageBySlug({ organizationId: null, slug: "home" })).resolves.toBeNull();

    expect(findFirstPayloadDoc).not.toHaveBeenCalled();
  });

  it("scopes page resolution by organization, website, slug, and archived state", async () => {
    await getPageBySlug({
      organizationId: "org_123",
      slug: "services",
      websiteId: "web_123",
    });

    expect(findFirstPayloadDoc).toHaveBeenCalledWith({
      collection: "pages",
      depth: 3,
      tags: ["tenant:org_123", "page:services"],
      where: {
        organizationId: { equals: "org_123" },
        slug: { equals: "services" },
        websiteId: { equals: "web_123" },
        workflowStatus: { not_equals: "archived" },
      },
    });
  });
});
