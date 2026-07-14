import { describe, expect, it } from "vitest";
import {
  countDetectableH1,
  normalizeSeoMetadata,
  resolveCanonicalUrl,
  resolveWebsiteCanonicalBase,
  runSeoRules,
} from "./seo";

const website = {
  canonicalBaseUrl: "https://example.com",
  defaultMetaDescription: "Default website description for shared SEO metadata.",
  id: "site_1",
  siteName: "Acme",
  siteTitle: "Acme Website",
  titleTemplate: "%s | Acme",
};

describe("SEO engine", () => {
  it("normalizes metadata with the configured fallback hierarchy", () => {
    const metadata = normalizeSeoMetadata({
      content: {
        id: "page_1",
        seo: {},
        slug: "home",
        title: "Home",
        type: "page",
        websiteId: "site_1",
      },
      path: "/",
      website,
    });

    expect(metadata.title).toBe("Home | Acme");
    expect(metadata.description).toBe("Default website description for shared SEO metadata.");
    expect(metadata.canonicalUrl).toBe("https://example.com/");
  });

  it("validates canonical URLs safely", () => {
    expect(resolveCanonicalUrl({ baseUrl: "https://example.com", path: "/about" })).toBe(
      "https://example.com/about",
    );
    expect(
      resolveCanonicalUrl({ explicitCanonical: "https://client.com/about", path: "/about" }),
    ).toBe("https://client.com/about");
    expect(
      resolveCanonicalUrl({ explicitCanonical: "javascript:alert(1)", path: "/about" }),
    ).toBeNull();
    expect(
      resolveCanonicalUrl({ explicitCanonical: "http://client.com/about", path: "/about" }),
    ).toBeNull();
  });

  it("resolves website canonical base from primary domain before provider URLs", () => {
    expect(
      resolveWebsiteCanonicalBase({
        fallbackBaseUrl: "https://fallback.example",
        primaryDomain: "client.example",
        productionUrl: "https://preview.example",
      }),
    ).toBe("https://client.example");
    expect(resolveWebsiteCanonicalBase({ productionUrl: "https://preview.example/path" })).toBe(
      "https://preview.example",
    );
    expect(resolveWebsiteCanonicalBase({ fallbackBaseUrl: "notaurl" })).toBeNull();
  });

  it("detects noindex, duplicate metadata, empty pages, and title thresholds", () => {
    const findings = runSeoRules({
      resources: [
        {
          blocks: [],
          id: "page_1",
          seo: {
            metaDescription: "Same description",
            metaTitle: "Short",
            robots: { index: false },
          },
          slug: "about",
          status: "published",
          title: "About",
          type: "page",
          websiteId: "site_1",
        },
        {
          id: "page_2",
          seo: { metaDescription: "Same description", metaTitle: "Short" },
          slug: "about",
          status: "published",
          title: "Team",
          type: "page",
          websiteId: "site_1",
        },
      ],
      website,
    });

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "published_noindex",
        "duplicate_slug",
        "duplicate_seo_title",
        "duplicate_meta_description",
        "empty_page_content",
        "seo_title_too_short",
      ]),
    );
  });

  it("detects supported H1 patterns without pretending to parse every block", () => {
    expect(countDetectableH1([{ blockType: "hero", headline: "Welcome" }])).toBe(1);
    expect(countDetectableH1([{ type: "hero", content: { headline: "Welcome" } }])).toBe(1);
    expect(countDetectableH1([{ blockType: "faq", headline: "Questions" }])).toBe(0);
    expect(countDetectableH1(null)).toBeNull();
  });
});
