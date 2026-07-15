import { and, desc, eq, ilike, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import {
  auditLogs,
  formFields,
  forms,
  formSubmissions,
  mediaAssets,
  organizations,
  pages,
  posts,
  websiteModules,
  websites,
} from "@agency/database/schema";
import { normalizeOrganizationSlug } from "@agency/auth/organizations";
import { assertDashboardPermission, getScopedOrganizationIds } from "./access";
import { compareDashboardDatesDesc } from "./dates";
import { getPagination } from "./filters";
import { requireWebsiteAccess } from "./projects";
import type { DashboardRequest, DashboardSearchParams } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

export const formFieldTypes = [
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "consent",
  "hidden",
] as const;

export type FormFieldType = (typeof formFieldTypes)[number];
export type SubmissionStatus = "archived" | "new" | "read" | "spam";
export type FormTemplate = "catering" | "contact" | "custom";
interface FormConfiguration {
  notification?: Record<string, unknown>;
  redirectUrl?: string | null;
  successMessage?: string | null;
}

export class FormValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormValidationError";
  }
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value.toString();
  return "";
}

function scopedOrgIds(request: DashboardRequest) {
  return getScopedOrganizationIds(request);
}

function formConfiguration(value: Record<string, unknown>): FormConfiguration {
  return {
    notification:
      typeof value.notification === "object" && value.notification !== null
        ? (value.notification as Record<string, unknown>)
        : {},
    redirectUrl: typeof value.redirectUrl === "string" ? value.redirectUrl : null,
    successMessage: typeof value.successMessage === "string" ? value.successMessage : null,
  };
}

async function uniqueFormSlug({
  database,
  name,
  organizationId,
  websiteId,
}: {
  database: Database;
  name: string;
  organizationId: string;
  websiteId: string;
}) {
  const base = normalizeOrganizationSlug(name);
  let slug = base;
  let suffix = 2;

  while (
    await database.query.forms.findFirst({
      where: and(
        eq(forms.organizationId, organizationId),
        eq(forms.websiteId, websiteId),
        eq(forms.slug, slug),
      ),
      columns: { id: true },
    })
  ) {
    slug = `${base}-${suffix.toString()}`;
    suffix += 1;
  }

  return slug;
}

function parseMetadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];
  return typeof value === "number" ? value : null;
}

export function getMediaType(mimeType: string): "document" | "image" | "other" | "pdf" | "video" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("word") ||
    mimeType.includes("presentation") ||
    mimeType.includes("spreadsheet") ||
    mimeType === "text/plain"
  ) {
    return "document";
  }

  return "other";
}

export async function getMediaOperations({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams & { type?: string; websiteId?: string };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "cms:read", params.organizationId);
  const { limit, offset } = getPagination(params);
  const orgIds = scopedOrgIds(request);
  const conditions = [
    isNull(mediaAssets.deletedAt),
    params.organizationId ? eq(mediaAssets.organizationId, params.organizationId) : undefined,
    params.websiteId ? eq(mediaAssets.websiteId, params.websiteId) : undefined,
    orgIds ? inArray(mediaAssets.organizationId, orgIds) : undefined,
    params.query ? ilike(mediaAssets.filename, `%${params.query}%`) : undefined,
    params.type && params.type !== "all"
      ? params.type === "application"
        ? ilike(mediaAssets.mimeType, "application/%")
        : ilike(mediaAssets.mimeType, `${params.type}/%`)
      : undefined,
  ].filter(Boolean);

  const rows = await database
    .select({
      altText: mediaAssets.altText,
      filename: mediaAssets.filename,
      id: mediaAssets.id,
      metadata: mediaAssets.metadata,
      mimeType: mediaAssets.mimeType,
      organizationId: mediaAssets.organizationId,
      organizationName: organizations.name,
      uploadedAt: mediaAssets.createdAt,
      uploadedByUserId: mediaAssets.uploadedByUserId,
      websiteId: mediaAssets.websiteId,
      websiteName: websites.name,
    })
    .from(mediaAssets)
    .innerJoin(organizations, eq(mediaAssets.organizationId, organizations.id))
    .leftJoin(websites, eq(mediaAssets.websiteId, websites.id))
    .where(and(...conditions))
    .orderBy(params.sort === "uploaded_asc" ? mediaAssets.createdAt : desc(mediaAssets.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map((row) => ({
      ...row,
      fileSize: parseMetadataNumber(row.metadata, "fileSize"),
      height: parseMetadataNumber(row.metadata, "height"),
      mediaType: getMediaType(row.mimeType),
      width: parseMetadataNumber(row.metadata, "width"),
    })),
    page: params.page,
  };
}

export function normalizeFormField(input: {
  helpText?: string | null;
  label: string;
  name?: string | null;
  options?: { label: string; value: string }[];
  placeholder?: string | null;
  required?: boolean;
  type: string;
}) {
  if (!formFieldTypes.includes(input.type as FormFieldType)) {
    throw new FormValidationError("Unsupported field type.");
  }

  const label = input.label.trim();
  const explicitName = input.name?.trim();
  let name = normalizeOrganizationSlug(label).replaceAll("-", "_");
  if (explicitName !== undefined && explicitName !== "") {
    name = explicitName;
  }

  if (!name || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new FormValidationError(
      "Field name must start with a letter and use letters, numbers, or underscores.",
    );
  }

  const options = (input.options ?? []).map((option) => ({
    label: option.label.trim().slice(0, 120),
    value: option.value.trim().slice(0, 120),
  }));

  if (input.type === "select") {
    if (options.length === 0) {
      throw new FormValidationError("Select fields require at least one option.");
    }

    const values = new Set(options.map((option) => option.value));
    if (
      values.size !== options.length ||
      options.some((option) => !option.label || !option.value)
    ) {
      throw new FormValidationError("Select options must have unique labels and values.");
    }
  }

  return {
    helpText: input.helpText?.trim() ?? null,
    label,
    name,
    options,
    placeholder: input.placeholder?.trim() ?? null,
    required: Boolean(input.required),
    type: input.type as FormFieldType,
  };
}

const publicFormFieldTypes = ["text", "email", "phone", "textarea", "select", "checkbox"] as const;

export function getFormTemplateFields(template: FormTemplate) {
  if (template === "contact") {
    return [
      normalizeFormField({ label: "Name", name: "name", required: true, type: "text" }),
      normalizeFormField({ label: "Email", name: "email", required: true, type: "email" }),
      normalizeFormField({
        label: "Topic",
        name: "topic",
        options: [
          { label: "General question", value: "general" },
          { label: "Takeaway", value: "takeaway" },
          { label: "Feedback", value: "feedback" },
          { label: "Partnership", value: "partnership" },
        ],
        required: true,
        type: "select",
      }),
      normalizeFormField({ label: "Message", name: "message", required: true, type: "textarea" }),
    ];
  }

  if (template === "catering") {
    return [
      normalizeFormField({ label: "Name", name: "name", required: true, type: "text" }),
      normalizeFormField({ label: "Email", name: "email", required: true, type: "email" }),
      normalizeFormField({ label: "Phone", name: "phone", required: true, type: "phone" }),
      normalizeFormField({ label: "Event date", name: "eventDate", required: true, type: "text" }),
      normalizeFormField({
        label: "Guest count",
        name: "guestCount",
        required: true,
        type: "text",
      }),
      normalizeFormField({
        label: "Service style",
        name: "serviceStyle",
        options: [
          { label: "Buffet", value: "buffet" },
          { label: "Boxed", value: "boxed" },
          { label: "Family style", value: "family-style" },
          { label: "Staffed", value: "staffed" },
        ],
        required: true,
        type: "select",
      }),
      normalizeFormField({ label: "Notes", name: "notes", required: false, type: "textarea" }),
    ];
  }

  return [];
}

function parseRequiredFlag(value: string | undefined) {
  return ["1", "required", "true", "yes"].includes((value ?? "").trim().toLowerCase());
}

function parseOptionDefinitions(value: string | undefined) {
  if (!value?.trim()) return [];

  return value
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean)
    .map((option) => {
      const [rawValue, rawLabel] = option.split(":");
      const optionValue = rawValue?.trim() ?? "";
      const trimmedLabel = rawLabel?.trim();
      let optionLabel = optionValue;
      if (trimmedLabel !== undefined && trimmedLabel !== "") {
        optionLabel = trimmedLabel;
      }

      return {
        label: optionLabel,
        value: optionValue,
      };
    });
}

export function parseFormFieldDefinitions(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [name, label, type = "text", required, options] = line
        .split("|")
        .map((part) => part.trim());

      if (!name || !label) {
        throw new FormValidationError(
          "Each field line must use: name | Label | type | required | options.",
        );
      }

      if (!publicFormFieldTypes.includes(type as (typeof publicFormFieldTypes)[number])) {
        throw new FormValidationError(
          "Public form fields support text, email, phone, textarea, select, and checkbox.",
        );
      }

      return normalizeFormField({
        label,
        name,
        options: parseOptionDefinitions(options),
        required: parseRequiredFlag(required),
        type,
      });
    });
}

export async function createForm({
  database,
  input,
  request,
}: {
  database: Database;
  input: {
    fields: ReturnType<typeof normalizeFormField>[];
    name: string;
    redirectUrl?: string | null;
    successMessage?: string | null;
    websiteId: string;
  };
  request: DashboardRequest;
}) {
  const website = await requireWebsiteAccess({
    database,
    request,
    websiteId: input.websiteId,
  });
  assertDashboardPermission(request, "forms:manage", website.organizationId);

  if (website.websiteType !== "sharoz_connected") {
    throw new FormValidationError("Forms are only available for Sharoz Connected websites.");
  }

  const moduleEnabled = await database.query.websiteModules.findFirst({
    where: and(
      eq(websiteModules.organizationId, website.organizationId),
      eq(websiteModules.websiteId, website.id),
      eq(websiteModules.moduleKey, "forms"),
      eq(websiteModules.enabled, true),
    ),
    columns: { id: true },
  });

  if (!moduleEnabled) {
    throw new FormValidationError("Forms module is not enabled for this website.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    throw new FormValidationError("Form name must be at least 2 characters.");
  }

  const slug = normalizeOrganizationSlug(name);
  const existingForm = await database.query.forms.findFirst({
    where: and(
      eq(forms.organizationId, website.organizationId),
      eq(forms.websiteId, website.id),
      eq(forms.slug, slug),
    ),
    columns: { id: true },
  });

  if (existingForm) {
    throw new FormValidationError(
      "A form with this slug already exists for this website. Use a different form name.",
    );
  }

  const safeRedirect = validateSafeRedirect(input.redirectUrl);
  const fieldNames = new Set(input.fields.map((field) => field.name));
  if (fieldNames.size !== input.fields.length) {
    throw new FormValidationError("Form field names must be unique.");
  }

  const [form] = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(forms)
      .values({
        configuration: {
          notification: {},
          redirectUrl: safeRedirect,
          successMessage: input.successMessage?.trim() ?? "Thanks, your submission was received.",
        },
        name,
        organizationId: website.organizationId,
        slug,
        status: "published",
        websiteId: website.id,
      })
      .returning();

    if (!created) {
      throw new FormValidationError("Form could not be created.");
    }

    if (input.fields.length > 0) {
      await tx.insert(formFields).values(
        input.fields.map((field, index) => ({
          fieldOrder: index,
          formId: created.id,
          helpText: field.helpText,
          label: field.label,
          name: field.name,
          options: field.options,
          organizationId: website.organizationId,
          placeholder: field.placeholder,
          required: field.required,
          type: field.type,
          websiteId: website.id,
        })),
      );
    }

    await tx.insert(auditLogs).values({
      action: "form.created",
      actorUserId: request.context.user.id,
      metadata: { websiteId: website.id },
      organizationId: website.organizationId,
      resourceId: created.id,
      resourceType: "form",
    });

    return [created];
  });

  return form;
}

export function validateSafeRedirect(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new FormValidationError("Redirect URL must be a valid relative or HTTPS URL.");
  }

  if (url.protocol !== "https:") {
    throw new FormValidationError("Redirect URL must use HTTPS.");
  }

  return url.toString();
}

export async function getForms({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams & { websiteId?: string };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "forms:read", params.organizationId);
  const { limit, offset } = getPagination(params);
  const orgIds = scopedOrgIds(request);
  const lifecycleCondition =
    params.status === "archived"
      ? isNotNull(forms.deletedAt)
      : params.status === "all"
        ? isNull(forms.deletedAt)
        : isNull(forms.deletedAt);
  const conditions = [
    lifecycleCondition,
    params.organizationId ? eq(forms.organizationId, params.organizationId) : undefined,
    params.websiteId ? eq(forms.websiteId, params.websiteId) : undefined,
    orgIds ? inArray(forms.organizationId, orgIds) : undefined,
    params.status !== "all" ? eq(forms.status, params.status as "draft") : undefined,
    params.query ? ilike(forms.name, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const rows = await database
    .select({
      id: forms.id,
      name: forms.name,
      organizationId: forms.organizationId,
      organizationName: organizations.name,
      slug: forms.slug,
      status: forms.status,
      updatedAt: forms.updatedAt,
      websiteId: forms.websiteId,
      websiteName: websites.name,
    })
    .from(forms)
    .innerJoin(organizations, eq(forms.organizationId, organizations.id))
    .innerJoin(websites, eq(forms.websiteId, websites.id))
    .where(and(...conditions))
    .orderBy(desc(forms.updatedAt))
    .limit(limit)
    .offset(offset);

  return { items: rows, page: params.page };
}

export async function requireFormAccess({
  database,
  formId,
  request,
}: {
  database: Database;
  formId: string;
  request: DashboardRequest;
}) {
  const form = await database.query.forms.findFirst({
    where: eq(forms.id, formId),
    with: { fields: { orderBy: (field, { asc }) => [asc(field.fieldOrder)] }, website: true },
  });

  if (!form) {
    throw new FormValidationError("Form was not found.");
  }

  assertDashboardPermission(request, "forms:read", form.organizationId);
  return form;
}

export async function updateForm({
  database,
  formId,
  input,
  request,
}: {
  database: Database;
  formId: string;
  input: {
    fields: ReturnType<typeof normalizeFormField>[];
    name: string;
    redirectUrl?: string | null;
    status: "draft" | "published";
    successMessage?: string | null;
  };
  request: DashboardRequest;
}) {
  const form = await requireFormAccess({ database, formId, request });
  assertDashboardPermission(request, "forms:manage", form.organizationId);

  if (form.deletedAt) {
    throw new FormValidationError("Archived forms must be restored by duplicating or recreated.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    throw new FormValidationError("Form name must be at least 2 characters.");
  }

  const slug = normalizeOrganizationSlug(name);
  const existingForm = await database.query.forms.findFirst({
    where: and(
      eq(forms.organizationId, form.organizationId),
      eq(forms.websiteId, form.websiteId),
      eq(forms.slug, slug),
    ),
    columns: { id: true },
  });

  if (existingForm && existingForm.id !== form.id) {
    throw new FormValidationError(
      "A form with this slug already exists for this website. Use a different form name.",
    );
  }

  const fieldNames = new Set(input.fields.map((field) => field.name));
  if (fieldNames.size !== input.fields.length) {
    throw new FormValidationError("Form field names must be unique.");
  }

  const now = new Date();
  const safeRedirect = validateSafeRedirect(input.redirectUrl);
  const [updated] = await database.transaction(async (tx) => {
    const [saved] = await tx
      .update(forms)
      .set({
        configuration: {
          ...formConfiguration(form.configuration),
          redirectUrl: safeRedirect,
          successMessage: input.successMessage?.trim() ?? "Thanks, your submission was received.",
        },
        name,
        slug,
        status: input.status,
        updatedAt: now,
      })
      .where(eq(forms.id, form.id))
      .returning();

    if (!saved) {
      throw new FormValidationError("Form could not be updated.");
    }

    await tx.delete(formFields).where(eq(formFields.formId, form.id));

    if (input.fields.length > 0) {
      await tx.insert(formFields).values(
        input.fields.map((field, index) => ({
          fieldOrder: index,
          formId: form.id,
          helpText: field.helpText,
          label: field.label,
          name: field.name,
          options: field.options,
          organizationId: form.organizationId,
          placeholder: field.placeholder,
          required: field.required,
          type: field.type,
          websiteId: form.websiteId,
        })),
      );
    }

    await tx.insert(auditLogs).values({
      action: "form.updated",
      actorUserId: request.context.user.id,
      metadata: { slug, websiteId: form.websiteId },
      organizationId: form.organizationId,
      resourceId: form.id,
      resourceType: "form",
    });

    return [saved];
  });

  return updated;
}

export async function duplicateForm({
  database,
  formId,
  request,
}: {
  database: Database;
  formId: string;
  request: DashboardRequest;
}) {
  const form = await requireFormAccess({ database, formId, request });
  assertDashboardPermission(request, "forms:manage", form.organizationId);

  const name = `${form.name} Copy`;
  const slug = await uniqueFormSlug({
    database,
    name,
    organizationId: form.organizationId,
    websiteId: form.websiteId,
  });

  const [duplicated] = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(forms)
      .values({
        configuration: form.configuration,
        name,
        organizationId: form.organizationId,
        slug,
        status: "draft",
        websiteId: form.websiteId,
      })
      .returning();

    if (!created) {
      throw new FormValidationError("Form could not be duplicated.");
    }

    if (form.fields.length > 0) {
      await tx.insert(formFields).values(
        form.fields.map((field) => ({
          fieldOrder: field.fieldOrder,
          formId: created.id,
          helpText: field.helpText,
          label: field.label,
          name: field.name,
          options: field.options,
          organizationId: created.organizationId,
          placeholder: field.placeholder,
          required: field.required,
          type: field.type,
          websiteId: created.websiteId,
        })),
      );
    }

    await tx.insert(auditLogs).values({
      action: "form.duplicated",
      actorUserId: request.context.user.id,
      metadata: { sourceFormId: form.id, websiteId: form.websiteId },
      organizationId: form.organizationId,
      resourceId: created.id,
      resourceType: "form",
    });

    return [created];
  });

  return duplicated;
}

export async function archiveForm({
  database,
  formId,
  request,
}: {
  database: Database;
  formId: string;
  request: DashboardRequest;
}) {
  const form = await database.query.forms.findFirst({
    where: and(eq(forms.id, formId), isNull(forms.deletedAt)),
  });

  if (!form) {
    throw new FormValidationError("Form was not found.");
  }

  assertDashboardPermission(request, "forms:manage", form.organizationId);
  const now = new Date();

  const [archived] = await database
    .update(forms)
    .set({
      deletedAt: now,
      status: "archived",
      updatedAt: now,
    })
    .where(and(eq(forms.id, form.id), isNull(forms.deletedAt)))
    .returning();

  if (!archived) {
    throw new FormValidationError("Form could not be archived.");
  }

  await database.insert(auditLogs).values({
    action: "form.archived",
    actorUserId: request.context.user.id,
    metadata: { slug: form.slug, websiteId: form.websiteId },
    organizationId: form.organizationId,
    resourceId: form.id,
    resourceType: "form",
  });

  return archived;
}

export async function permanentlyDeleteForm({
  database,
  formId,
  request,
}: {
  database: Database;
  formId: string;
  request: DashboardRequest;
}) {
  const form = await database.query.forms.findFirst({
    where: eq(forms.id, formId),
  });

  if (!form) {
    throw new FormValidationError("Form was not found.");
  }

  assertDashboardPermission(request, "forms:manage", form.organizationId);

  if (form.status !== "archived" || !form.deletedAt) {
    throw new FormValidationError("Archive this form before permanently deleting it.");
  }

  const [deleted] = await database.transaction(async (tx) => {
    await tx.insert(auditLogs).values({
      action: "form.deleted",
      actorUserId: request.context.user.id,
      metadata: { slug: form.slug, websiteId: form.websiteId },
      organizationId: form.organizationId,
      resourceId: form.id,
      resourceType: "form",
    });

    const [removed] = await tx.delete(forms).where(eq(forms.id, form.id)).returning();
    return [removed];
  });

  if (!deleted) {
    throw new FormValidationError("Form could not be deleted.");
  }

  return deleted;
}

export async function getSubmissions({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams & { formId?: string; websiteId?: string };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "forms:read", params.organizationId);
  const { limit, offset } = getPagination(params);
  const orgIds = scopedOrgIds(request);
  const conditions = [
    isNull(formSubmissions.deletedAt),
    params.organizationId ? eq(formSubmissions.organizationId, params.organizationId) : undefined,
    params.websiteId ? eq(formSubmissions.websiteId, params.websiteId) : undefined,
    params.formId ? eq(formSubmissions.formId, params.formId) : undefined,
    orgIds ? inArray(formSubmissions.organizationId, orgIds) : undefined,
    params.status !== "all"
      ? eq(formSubmissions.status, params.status as SubmissionStatus)
      : undefined,
  ].filter(Boolean);

  const rows = await database
    .select({
      formId: formSubmissions.formId,
      formName: forms.name,
      id: formSubmissions.id,
      organizationId: formSubmissions.organizationId,
      organizationName: organizations.name,
      status: formSubmissions.status,
      submittedAt: formSubmissions.submittedAt,
      websiteId: formSubmissions.websiteId,
      websiteName: websites.name,
    })
    .from(formSubmissions)
    .innerJoin(forms, eq(formSubmissions.formId, forms.id))
    .innerJoin(organizations, eq(formSubmissions.organizationId, organizations.id))
    .innerJoin(websites, eq(formSubmissions.websiteId, websites.id))
    .where(and(...conditions))
    .orderBy(desc(formSubmissions.submittedAt))
    .limit(limit)
    .offset(offset);

  return { items: rows, page: params.page };
}

export async function requireSubmissionAccess({
  database,
  request,
  submissionId,
}: {
  database: Database;
  request: DashboardRequest;
  submissionId: string;
}) {
  const submission = await database.query.formSubmissions.findFirst({
    where: and(eq(formSubmissions.id, submissionId), isNull(formSubmissions.deletedAt)),
    with: { form: true, organization: true, website: true },
  });

  if (!submission) {
    throw new FormValidationError("Submission was not found.");
  }

  assertDashboardPermission(request, "forms:read", submission.organizationId);
  return submission;
}

export async function updateSubmissionStatus({
  database,
  request,
  status,
  submissionId,
}: {
  database: Database;
  request: DashboardRequest;
  status: SubmissionStatus;
  submissionId: string;
}) {
  const submission = await requireSubmissionAccess({ database, request, submissionId });
  assertDashboardPermission(request, "forms:manage", submission.organizationId);
  const now = new Date();
  const [updated] = await database
    .update(formSubmissions)
    .set({
      archivedAt: status === "archived" ? now : submission.archivedAt,
      readAt: status === "read" ? now : submission.readAt,
      spamAt: status === "spam" ? now : submission.spamAt,
      status,
      updatedAt: now,
    })
    .where(eq(formSubmissions.id, submission.id))
    .returning();

  await database.insert(auditLogs).values({
    action:
      status === "read"
        ? "submission.marked_read"
        : status === "archived"
          ? "submission.archived"
          : status === "spam"
            ? "submission.marked_spam"
            : "submission.updated",
    actorUserId: request.context.user.id,
    metadata: { formId: submission.formId },
    organizationId: submission.organizationId,
    resourceId: submission.id,
    resourceType: "form_submission",
  });

  return updated;
}

export async function getWebsiteOperationalSummary({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, request, websiteId });
  const [mediaCount, missingAlt, activeForms, unreadSubmissions, draftPages, draftPosts] =
    await Promise.all([
      database
        .select({ value: sql<number>`count(*)` })
        .from(mediaAssets)
        .where(and(eq(mediaAssets.websiteId, website.id), isNull(mediaAssets.deletedAt))),
      database
        .select({ value: sql<number>`count(*)` })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.websiteId, website.id),
            ilike(mediaAssets.mimeType, "image/%"),
            isNull(mediaAssets.altText),
            isNull(mediaAssets.deletedAt),
          ),
        ),
      database
        .select({ value: sql<number>`count(*)` })
        .from(forms)
        .where(
          and(
            eq(forms.websiteId, website.id),
            eq(forms.status, "published"),
            isNull(forms.deletedAt),
          ),
        ),
      database
        .select({ value: sql<number>`count(*)` })
        .from(formSubmissions)
        .where(
          and(
            eq(formSubmissions.websiteId, website.id),
            eq(formSubmissions.status, "new"),
            isNull(formSubmissions.deletedAt),
          ),
        ),
      database
        .select({ value: sql<number>`count(*)` })
        .from(pages)
        .where(
          and(eq(pages.websiteId, website.id), eq(pages.status, "draft"), isNull(pages.deletedAt)),
        ),
      database
        .select({ value: sql<number>`count(*)` })
        .from(posts)
        .where(
          and(eq(posts.websiteId, website.id), eq(posts.status, "draft"), isNull(posts.deletedAt)),
        ),
    ]);

  return {
    activeForms: activeForms[0]?.value ?? 0,
    draftContent: (draftPages[0]?.value ?? 0) + (draftPosts[0]?.value ?? 0),
    mediaCount: mediaCount[0]?.value ?? 0,
    missingAlt: missingAlt[0]?.value ?? 0,
    unreadSubmissions: unreadSubmissions[0]?.value ?? 0,
  };
}

export async function getContentOperationsV2({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams & { contentType?: string; websiteId?: string };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "cms:read", params.organizationId);
  const orgIds = scopedOrgIds(request);
  const includePages =
    !params.contentType || params.contentType === "all" || params.contentType === "page";
  const includePosts =
    !params.contentType || params.contentType === "all" || params.contentType === "post";
  const pageConditions = [
    isNull(pages.deletedAt),
    params.organizationId ? eq(pages.organizationId, params.organizationId) : undefined,
    params.websiteId ? eq(pages.websiteId, params.websiteId) : undefined,
    orgIds ? inArray(pages.organizationId, orgIds) : undefined,
    params.status !== "all" ? eq(pages.status, params.status as "draft") : undefined,
    params.query ? ilike(pages.title, `%${params.query}%`) : undefined,
  ].filter(Boolean);
  const postConditions = [
    isNull(posts.deletedAt),
    params.organizationId ? eq(posts.organizationId, params.organizationId) : undefined,
    params.websiteId ? eq(posts.websiteId, params.websiteId) : undefined,
    orgIds ? inArray(posts.organizationId, orgIds) : undefined,
    params.status !== "all" ? eq(posts.status, params.status as "draft") : undefined,
    params.query ? ilike(posts.title, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const [pageRows, postRows] = await Promise.all([
    includePages
      ? database
          .select({
            id: pages.id,
            organizationId: pages.organizationId,
            slug: pages.slug,
            status: pages.status,
            title: pages.title,
            type: sql<"page">`'page'`,
            updatedAt: pages.updatedAt,
            websiteId: pages.websiteId,
          })
          .from(pages)
          .where(and(...pageConditions))
          .orderBy(desc(pages.updatedAt))
          .limit(30)
      : [],
    includePosts
      ? database
          .select({
            id: posts.id,
            organizationId: posts.organizationId,
            slug: posts.slug,
            status: posts.status,
            title: posts.title,
            type: sql<"post">`'post'`,
            updatedAt: posts.updatedAt,
            websiteId: posts.websiteId,
          })
          .from(posts)
          .where(and(...postConditions))
          .orderBy(desc(posts.updatedAt))
          .limit(30)
      : [],
  ]);

  const items = [...pageRows, ...postRows].sort((a, b) =>
    compareDashboardDatesDesc(a.updatedAt, b.updatedAt),
  );
  return { items, page: params.page };
}

export function normalizeSubmissionData({
  fields,
  payload,
}: {
  fields: { name: string; required: boolean; type: string }[];
  payload: Record<string, unknown>;
}) {
  const allowed = new Set(fields.map((field) => field.name));
  const normalized: Record<string, string | string[] | boolean> = {};

  for (const key of Object.keys(payload)) {
    if (key === "_hp") continue;
    if (!allowed.has(key)) {
      throw new FormValidationError(`Unknown field "${key}" was submitted.`);
    }
  }

  for (const field of fields) {
    const value = payload[field.name];
    if (field.required && (value === undefined || value === "" || value === false)) {
      throw new FormValidationError(`${field.name} is required.`);
    }

    if (value === undefined) continue;
    normalized[field.name] =
      typeof value === "boolean"
        ? value
        : Array.isArray(value)
          ? value.map(safeString).slice(0, 20)
          : safeString(value).slice(0, 5000);
  }

  return normalized;
}
