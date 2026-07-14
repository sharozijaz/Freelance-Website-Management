import { NextResponse } from "next/server";
import type { PlatformApiSuccessResponse } from "@sharoz/contracts";
import { operationalHeaders } from "@/lib/observability/responses";

export function platformDataResponse<T>(data: T, init?: ResponseInit, requestId?: string) {
  return NextResponse.json(
    { data } satisfies PlatformApiSuccessResponse<T>,
    {
      ...init,
      headers: {
        ...operationalHeaders(requestId),
        ...Object.fromEntries(new Headers(init?.headers).entries()),
      },
    },
  );
}
