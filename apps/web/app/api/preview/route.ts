import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPreviewToken } from "@agency/lib/preview";
import { previewSecret } from "@/lib/config";

export async function GET(request: Request) {
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
