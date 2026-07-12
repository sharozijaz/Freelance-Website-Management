import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./redirects";

describe("safe redirects", () => {
  it("keeps relative dashboard destinations with query strings", () => {
    expect(getSafeRedirectPath("/websites/123?tab=seo")).toBe("/websites/123?tab=seo");
  });

  it("falls back for external URLs", () => {
    expect(getSafeRedirectPath("https://evil.example/login")).toBe("/");
    expect(getSafeRedirectPath("//evil.example/login")).toBe("/");
  });

  it("falls back for empty or malformed values", () => {
    expect(getSafeRedirectPath("")).toBe("/");
    expect(getSafeRedirectPath(undefined)).toBe("/");
    expect(getSafeRedirectPath(["/clients", "/websites"])).toBe("/clients");
  });
});
