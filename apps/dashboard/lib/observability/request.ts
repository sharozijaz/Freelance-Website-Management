import { randomUUID } from "node:crypto";

export const requestIdHeader = "X-Request-Id";

const trustedRequestIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export function createRequestId(candidate?: string | null) {
  const value = candidate?.trim();

  if (value && trustedRequestIdPattern.test(value)) {
    return value;
  }

  return randomUUID();
}
