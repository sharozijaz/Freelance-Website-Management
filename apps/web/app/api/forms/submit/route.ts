import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { auditLogs, formFields, forms, formSubmissions } from "@agency/database/schema";
import { database } from "@/lib/database";
import { normalizeSubmissionData, validateSafeRedirect } from "@/features/forms";

const maxSubmissionBytes = 64 * 1024;

function toPayload(formData: FormData) {
  const payload: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

  for (const [key, value] of formData.entries()) {
    if (payload[key] === undefined) {
      payload[key] = value;
      continue;
    }

    const currentValue = payload[key];
    payload[key] = Array.isArray(currentValue)
      ? currentValue.concat(value)
      : [currentValue, value];
  }

  return payload;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxSubmissionBytes) {
    return NextResponse.json({ error: "Submission is too large." }, { status: 413 });
  }

  const formData = await request.formData();
  const payload = toPayload(formData);
  const formId = formData.get("formId");

  if (typeof formId !== "string") {
    return NextResponse.json({ error: "Form is required." }, { status: 400 });
  }

  const [form] = await database
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
    .limit(1);

  if (form?.status !== "published") {
    return NextResponse.json({ error: "Form is not available." }, { status: 404 });
  }

  const fields = await database
    .select()
    .from(formFields)
    .where(and(eq(formFields.formId, form.id), isNull(formFields.deletedAt)))
    .orderBy(asc(formFields.fieldOrder));

  if (typeof payload._hp === "string" && payload._hp.trim()) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const data = normalizeSubmissionData({
    fields: fields.map((field) => ({
      name: field.name,
      required: field.required,
      type: field.type,
    })),
    payload,
  });

  const configuration = form.configuration as {
    redirectUrl?: string | null;
    successMessage?: string | null;
  };
  const redirectUrl = validateSafeRedirect(configuration.redirectUrl);

  const source: { path?: string; referrer?: string; userAgent?: string } = {};
  const referer = request.headers.get("referer");
  const origin = request.headers.get("origin");
  const userAgent = request.headers.get("user-agent");

  if (referer) source.path = referer;
  if (origin) source.referrer = origin;
  if (userAgent) source.userAgent = userAgent;

  const [submission] = await database
    .insert(formSubmissions)
    .values({
      data,
      formId: form.id,
      organizationId: form.organizationId,
      source,
      websiteId: form.websiteId,
    })
    .returning({ id: formSubmissions.id });

  if (submission) {
    await database.insert(auditLogs).values({
      action: "form.submission_received",
      metadata: { formId: form.id, websiteId: form.websiteId },
      organizationId: form.organizationId,
      resourceId: submission.id,
      resourceType: "form_submission",
    });
  }

  return NextResponse.json({
    ok: true,
    redirectUrl,
    successMessage: configuration.successMessage ?? "Thanks, your submission was received.",
  });
}
