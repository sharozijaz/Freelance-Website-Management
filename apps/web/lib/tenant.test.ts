import { describe, expect, it } from "vitest";
import { normalizeRequestHostname } from "./tenant";

describe("tenant resolution helpers", () => {
  it("normalizes request hostnames before domain lookup", () => {
    expect(normalizeRequestHostname("WWW.Example.COM:443")).toBe("www.example.com");
    expect(normalizeRequestHostname("client.example")).toBe("client.example");
  });
});
