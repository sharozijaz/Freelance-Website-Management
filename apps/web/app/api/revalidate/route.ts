import { revalidatePath, revalidateTag } from "next/cache";
import { verifyPreviewToken } from "@agency/lib/preview";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

interface RevalidationPayload {
  organizationId?: string;
  path?: string;
  tags?: string[];
  token?: string;
}

function isRevalidationPayload(value: unknown): value is RevalidationPayload {
  return Boolean(value && typeof value === "object");
}

export async function POST(request: Request) {
  if (
    !checkRateLimit({
      key: `revalidate:${getRequestIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    })
  ) {
    return Response.json({ error: "Too many revalidation requests" }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);

  if (!isRevalidationPayload(body) || !body.token || !body.path || !body.organizationId) {
    return Response.json({ error: "Invalid revalidation payload" }, { status: 400 });
  }

  const secret = process.env.WEBSITE_REVALIDATION_SECRET ?? "development-revalidation-secret";
  const token = verifyPreviewToken(body.token, secret);

  if (!(token?.organizationId === body.organizationId && token.path === body.path)) {
    return Response.json({ error: "Invalid revalidation token" }, { status: 401 });
  }

  revalidatePath(body.path);

  for (const tag of body.tags ?? []) {
    revalidateTag(tag);
  }

  return Response.json({
    organizationId: body.organizationId,
    path: body.path,
    revalidated: true,
  });
}
