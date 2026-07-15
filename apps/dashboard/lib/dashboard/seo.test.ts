import { describe, expect, it } from "vitest";
import { getSeoActionHref } from "./seo";

describe("dashboard SEO actions", () => {
  it("routes Blog post SEO findings to the V2 Blog editor", () => {
    expect(
      getSeoActionHref({
        resourceId: "post_123",
        resourceType: "post",
        websiteId: "website_123",
      }),
    ).toBe("/websites/website_123/blog/post_123");
  });

  it("routes media SEO findings to website-scoped V2 media management", () => {
    expect(
      getSeoActionHref({
        resourceId: "media_123",
        resourceType: "media",
        websiteId: "website_123",
      }),
    ).toBe("/websites/website_123/media");
  });

  it("routes website SEO findings to the website SEO settings screen", () => {
    expect(
      getSeoActionHref({
        resourceId: "website_123",
        resourceType: "website",
        websiteId: "website_123",
      }),
    ).toBe("/websites/website_123/seo");
  });

  it("routes legacy page SEO findings to website review", () => {
    expect(
      getSeoActionHref({
        resourceId: "page_123",
        resourceType: "page",
        websiteId: "website_123",
      }),
    ).toBe("/websites/website_123");
  });
});
