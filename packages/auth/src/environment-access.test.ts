import { describe, expect, it } from "vitest";
import {
  generateEnvironmentAccessSecret,
  hashEnvironmentAccessSecret,
  verifyEnvironmentAccessSecret,
} from "./environment-access";

describe("environment access secrets", () => {
  it("generates opaque server-side tokens", () => {
    const token = generateEnvironmentAccessSecret();

    expect(token).toMatch(/^env_[A-Za-z0-9_-]{43,}$/);
  });

  it("hashes and verifies without storing plaintext", () => {
    const token = generateEnvironmentAccessSecret();
    const hash = hashEnvironmentAccessSecret(token);

    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(verifyEnvironmentAccessSecret({ hash, secret: token })).toBe(true);
    expect(verifyEnvironmentAccessSecret({ hash, secret: `${token}x` })).toBe(false);
  });
});
