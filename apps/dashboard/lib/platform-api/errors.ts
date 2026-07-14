import { NextResponse } from "next/server";
import type { PlatformApiErrorCode, PlatformApiErrorResponse } from "@sharoz/contracts";
import { logger } from "@/lib/observability/logger";
import { operationalHeaders } from "@/lib/observability/responses";

const defaultMessages = {
  CONFLICT: "The request conflicts with the current resource state.",
  INTERNAL_ERROR: "An internal error occurred.",
  INVALID_REQUEST: "The request is invalid.",
  MODULE_NOT_ENABLED: "The requested module is not available.",
  NOT_FOUND: "The requested resource was not found.",
  UNAUTHORIZED: "Authentication is required.",
} satisfies Record<PlatformApiErrorCode, string>;

const defaultStatuses = {
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  INVALID_REQUEST: 400,
  MODULE_NOT_ENABLED: 403,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
} satisfies Record<PlatformApiErrorCode, number>;

export class PlatformApiError extends Error {
  readonly code: PlatformApiErrorCode;
  readonly status: number;

  constructor({
    code,
    message = defaultMessages[code],
    status = defaultStatuses[code],
  }: {
    code: PlatformApiErrorCode;
    message?: string;
    status?: number;
  }) {
    super(message);
    this.name = "PlatformApiError";
    this.code = code;
    this.status = status;
  }
}

export function toPlatformErrorResponse(
  error: unknown,
  requestId?: string,
): NextResponse<PlatformApiErrorResponse> {
  if (error instanceof PlatformApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { headers: operationalHeaders(requestId), status: error.status },
    );
  }

  logger.error("platform_api.unexpected_error", { error }, requestId);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: defaultMessages.INTERNAL_ERROR,
      },
    },
    { headers: operationalHeaders(requestId), status: defaultStatuses.INTERNAL_ERROR },
  );
}
