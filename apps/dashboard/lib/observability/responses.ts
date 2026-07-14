import { NextResponse } from "next/server";
import { logger } from "./logger";
import { requestIdHeader } from "./request";

export const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export function operationalHeaders(requestId?: string) {
  return {
    ...noStoreHeaders,
    ...(requestId ? { [requestIdHeader]: requestId } : {}),
  };
}

export function safeUnexpectedErrorResponse({
  error,
  event,
  requestId,
}: {
  error: unknown;
  event: string;
  requestId: string;
}) {
  logger.error(event, { error }, requestId);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId,
      },
    },
    { headers: operationalHeaders(requestId), status: 500 },
  );
}
