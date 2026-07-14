import { database } from "@/lib/database";
import { getPlatformContextResponse } from "@/lib/platform-api/context-route";

export async function GET(request: Request) {
  return getPlatformContextResponse({ database, request });
}
