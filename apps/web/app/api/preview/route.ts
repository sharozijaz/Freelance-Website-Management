import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPreviewToken } from "@agency/lib/preview";
import { previewSecret } from "@/lib/config";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (
    !checkRateLimit({
      key: `preview:${getRequestIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    })
  ) {
    return new Response("Too many preview requests", { status: 429 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing preview token", { status: 400 });
  }

  const preview = verifyPreviewToken(token, previewSecret);

  if (!preview) {
    return new Response("Invalid preview token", { status: 401 });
  }

  if (
    process.env.WEB_ORGANIZATION_ID &&
    process.env.WEB_ORGANIZATION_ID !== preview.organizationId
  ) {
    return new Response("Preview token does not match this website tenant", { status: 403 });
  }

  const draft = await draftMode();
  draft.enable();
  redirect(preview.path);
}
