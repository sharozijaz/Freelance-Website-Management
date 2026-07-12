import { describe, expect, it } from "vitest";
import { buildStructuredData } from "./seo";
import type { PayloadPage } from "./payload/types";

describe("website SEO integration", () => {
  it("generates safe structured data including FAQ content", () => {
    const page: PayloadPage = {
      id: "page_1",
      layout: [
        {
          blockType: "faq",
          items: [{ answer: "Use the CMS.", question: "How do I edit?" }],
        },
      ],
      organizationId: "org_1",
      seo: { metaTitle: "Help", metaDescription: "Helpful answers for customers." },
      slug: "help",
      title: "Help",
      websiteId: "site_1",
      workflowStatus: "published",
    };

    const graph = buildStructuredData({
      content: page,
      pathname: "/help",
      settings: {
        id: "settings_1",
        organizationId: "org_1",
        seo: { canonicalBaseUrl: "https://example.com", siteName: "Acme" },
        siteName: "Acme",
      },
    });

    expect(graph.map((item) => item["@type"])).toContain("FAQPage");
    expect(JSON.stringify(graph)).not.toContain("<script");
  });
});
