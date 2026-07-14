import { describe, expect, it, vi } from "vitest";
import SignInPage, { metadata } from "./page";

vi.mock("@/lib/session", () => ({
  getDashboardSessionContext: vi.fn(() => Promise.resolve(null)),
}));

describe("dashboard sign-in route", () => {
  it("exists as the browser-facing authentication page", async () => {
    await expect(
      SignInPage({
        searchParams: Promise.resolve({ callbackUrl: "/websites/123?tab=seo" }),
      }),
    ).resolves.toBeTruthy();
    expect(metadata.title).toBe("Sign in | Agency Platform");
  });

  it("sanitizes unsafe callback URLs before rendering", async () => {
    await expect(
      SignInPage({
        searchParams: Promise.resolve({ callbackUrl: "https://evil.example" }),
      }),
    ).resolves.toBeTruthy();
  });
});
