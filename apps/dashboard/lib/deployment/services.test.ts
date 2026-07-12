import { describe, expect, it } from "vitest";
import { normalizeHostname, normalizeProductionUrl } from "./services";

describe("deployment services", () => {
  it("normalizes safe hostnames", () => {
    expect(normalizeHostname("HTTPS://WWW.Example.COM/about")).toBe("www.example.com");
    expect(normalizeHostname("client-site.co")).toBe("client-site.co");
  });

  it("rejects unsafe or ambiguous hostnames", () => {
    expect(() => normalizeHostname("localhost:3000")).toThrow();
    expect(() => normalizeHostname("https://example.com?x=1")).toThrow();
    expect(() => normalizeHostname("not a domain")).toThrow();
  });

  it("normalizes production origins", () => {
    expect(normalizeProductionUrl("example.com/path?x=1")).toBe("https://example.com");
    expect(normalizeProductionUrl("https://www.example.com/landing")).toBe("https://www.example.com");
  });
});
