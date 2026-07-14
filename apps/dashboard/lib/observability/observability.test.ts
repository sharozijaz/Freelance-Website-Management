import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformApiError, toPlatformErrorResponse } from "@/lib/platform-api/errors";
import { platformDataResponse } from "@/lib/platform-api/responses";
import { getHealthStatus } from "./health";
import { logger } from "./logger";
import { createRequestId } from "./request";
import { operationalHeaders } from "./responses";
import { redactSensitive } from "./redaction";

interface PlatformApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

describe("observability redaction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recursively redacts sensitive keys and known secret formats", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const redacted = redactSensitive({
      authorization: "Bearer secret-token",
      nested: {
        DATABASE_URL: "postgres://user:pass@localhost:5432/app",
        message:
          "failed with DATABASE_URL=postgres://user:pass@localhost:5432/app token=abc123",
      },
      publicValue: "hello",
      circular,
    });
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("user:pass");
    expect(serialized).not.toContain("abc123");
    expect(serialized).toContain("hello");
    expect(serialized).toContain("[circular]");
  });

  it("writes structured logs without raw secrets", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logger.error("test.event", {
      error: new Error("DATABASE_URL=postgres://user:pass@host/db token=abc"),
      secret: "plain-secret",
    });

    const line = String(spy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("\"event\":\"test.event\"");
    expect(line).not.toContain("plain-secret");
    expect(line).not.toContain("user:pass");
    expect(line).not.toContain("abc");
  });
});

describe("request correlation and safe responses", () => {
  it("preserves trusted inbound request ids and rejects unsafe ones", () => {
    expect(createRequestId("req_12345678")).toBe("req_12345678");
    expect(createRequestId("short")).not.toBe("short");
    expect(createRequestId("bad id with spaces")).not.toBe("bad id with spaces");
  });

  it("adds no-store and request id headers", () => {
    const headers = operationalHeaders("req_12345678");

    expect(headers["Cache-Control"]).toContain("no-store");
    expect(headers["X-Request-Id"]).toBe("req_12345678");
  });

  it("returns safe Platform API errors with cache and request headers", async () => {
    const response = toPlatformErrorResponse(
      new PlatformApiError({ code: "INVALID_REQUEST", message: "Bad input." }),
      "req_12345678",
    );
    const body = (await response.json()) as PlatformApiErrorBody;

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Request-Id")).toBe("req_12345678");
    expect(body.error.message).toBe("Bad input.");
  });

  it("does not leak unexpected Platform API error details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = toPlatformErrorResponse(
      new Error("postgres://user:pass@localhost/db Authorization: Bearer abc"),
      "req_12345678",
    );
    const body = (await response.json()) as PlatformApiErrorBody;

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("user:pass");
    expect(JSON.stringify(body)).not.toContain("Bearer abc");
    expect(body.error.message).toBe("An internal error occurred.");
  });

  it("marks Platform API data responses as no-store", () => {
    const response = platformDataResponse({ ok: true }, undefined, "req_12345678");

    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Request-Id")).toBe("req_12345678");
  });
});

describe("health status", () => {
  it("reports ok when application and database checks pass", async () => {
    await expect(getHealthStatus({ checkDatabase: () => Promise.resolve() })).resolves.toMatchObject({
      checks: { application: "ok", database: "ok" },
      status: "ok",
    });
  });

  it("reports error without exposing database failure details", async () => {
    const status = await getHealthStatus({
      checkDatabase: () => Promise.reject(new Error("postgres://user:pass@host/db")),
    });

    expect(status.status).toBe("error");
    expect(status.checks.database).toBe("error");
    expect(JSON.stringify(status)).not.toContain("user:pass");
  });
});
