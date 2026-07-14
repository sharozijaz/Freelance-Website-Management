import { describe, expect, it } from "vitest";
import {
  createSessionValue,
  hashAccessSecret,
  isValidSessionValue,
  safeRedirectPath,
  verifyAccessSecret,
} from "./access-core";

describe("connected site access helpers", () => {
  it("verifies access tokens against stored hashes", () => {
    const hash = hashAccessSecret("preview-token");

    expect(verifyAccessSecret({ expectedHash: hash, providedSecret: "preview-token" })).toBe(true);
    expect(verifyAccessSecret({ expectedHash: hash, providedSecret: "wrong" })).toBe(false);
    expect(verifyAccessSecret({ expectedHash: null, providedSecret: "preview-token" })).toBe(false);
  });

  it("derives rotation-sensitive cookie session values", () => {
    const hash = hashAccessSecret("staging-token");
    const value = createSessionValue({ hash, kind: "staging" });

    expect(isValidSessionValue({ hash, kind: "staging", value })).toBe(true);
    expect(isValidSessionValue({ hash, kind: "preview", value })).toBe(false);
    expect(
      isValidSessionValue({ hash: hashAccessSecret("new-token"), kind: "staging", value }),
    ).toBe(false);
  });

  it("keeps redirects on the connected site", () => {
    expect(safeRedirectPath("/blog/post?x=1")).toBe("/blog/post?x=1");
    expect(safeRedirectPath("https://evil.test")).toBe("/blog");
    expect(safeRedirectPath("//evil.test")).toBe("/blog");
  });
});
