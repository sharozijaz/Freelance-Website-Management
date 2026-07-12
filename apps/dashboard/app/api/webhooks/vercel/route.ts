import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function verifySignature(body: string, signature: string | null) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature.replace(/^sha256=/, ""));

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-vercel-signature");

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  return NextResponse.json({
    accepted: true,
    message: "Webhook verified. Deployment synchronization will process provider events here.",
  });
}
