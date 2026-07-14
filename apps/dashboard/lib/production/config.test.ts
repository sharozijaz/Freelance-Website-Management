import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "./config";

describe("production environment validation", () => {
  it("fails loudly when required variables are missing", () => {
    const result = validateProductionEnvironment({});

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("DATABASE_URL is required.");
    expect(result.errors).toContain("BETTER_AUTH_SECRET is required.");
    expect(result.errors).toContain("BETTER_AUTH_URL is required.");
    expect(result.errors).toContain("NEXT_PUBLIC_APP_URL is required.");
  });

  it("rejects placeholder production configuration", () => {
    const result = validateProductionEnvironment({
      BETTER_AUTH_SECRET: "development-secret-change-before-production",
      BETTER_AUTH_URL: "https://example.com",
      DATABASE_URL: "postgres://user:pass@db.example.com/app",
      NEXT_PUBLIC_APP_URL: "https://manage.sharoz.dev",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("BETTER_AUTH_SECRET must not use a placeholder value.");
    expect(result.errors).toContain("BETTER_AUTH_URL must not use a placeholder value.");
  });

  it("does not include secret values in validation errors", () => {
    const result = validateProductionEnvironment({
      BETTER_AUTH_SECRET: "development-secret-change-before-production",
      BETTER_AUTH_URL: "not-a-url",
      DATABASE_URL: "postgres://private-user:private-pass@private-host/app",
      NEXT_PUBLIC_APP_URL: "https://manage.sharoz.dev",
    });
    const serialized = JSON.stringify(result.errors);

    expect(serialized).not.toContain("private-user");
    expect(serialized).not.toContain("private-pass");
    expect(serialized).not.toContain("development-secret-change-before-production");
  });

  it("passes complete non-placeholder configuration", () => {
    const result = validateProductionEnvironment({
      BETTER_AUTH_SECRET: "prod-secret-with-enough-entropy",
      BETTER_AUTH_URL: "https://dashboard.sharoz.dev",
      DATABASE_URL: "postgres://user:pass@db.sharoz.dev/app",
      NEXT_PUBLIC_APP_URL: "https://manage.sharoz.dev",
    });

    expect(result).toEqual({ errors: [], ok: true });
  });

  it("does not require legacy CMS URLs for the V2 production dashboard", () => {
    const result = validateProductionEnvironment({
      BETTER_AUTH_SECRET: "prod-secret-with-enough-entropy",
      BETTER_AUTH_URL: "https://manage.sharoz.dev",
      DATABASE_URL: "postgres://user:pass@db.sharoz.dev/app",
      NEXT_PUBLIC_APP_URL: "https://manage.sharoz.dev",
    });

    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.errors)).not.toContain("CMS");
    expect(JSON.stringify(result.errors)).not.toContain("PAYLOAD");
  });
});
