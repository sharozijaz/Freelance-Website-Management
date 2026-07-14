import { and, eq, isNull } from "drizzle-orm";
import type {
  FormListResponse,
  FormResponse,
  FormSubmitRequest,
  FormSubmitResponse,
  PublicForm,
  PublicFormField,
} from "@sharoz/contracts";
import { formSubmitRequestSchema } from "@sharoz/contracts";
import type { createDatabaseClient } from "@agency/database";
import { forms, formSubmissions, type formFields } from "@agency/database/schema";
import type { PlatformRequestContext } from "./auth";
import { PlatformApiError } from "./errors";
import { requireEnabledModule } from "./modules";

type Database = ReturnType<typeof createDatabaseClient>;

const defaultPage = 1;
const defaultLimit = 20;
const maxLimit = 50;
const maxBodyBytes = 64 * 1024;
const maxFieldCount = 50;
const maxStringLength = 5000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DatabaseForm = typeof forms.$inferSelect & {
  fields: (typeof formFields.$inferSelect)[];
};

type PublicSubmissionValue = string | string[] | boolean;

export interface FormListOptions {
  limit?: number | null;
  page?: number | null;
}

export function supportedPublicFieldType(type: string): PublicFormField["type"] | null {
  if (type === "phone") return "tel";
  if (
    type === "text" ||
    type === "email" ||
    type === "textarea" ||
    type === "select" ||
    type === "checkbox"
  ) {
    return type;
  }

  return null;
}

function normalizePositiveInteger({
  fallback,
  max,
  min = 1,
  name,
  value,
}: {
  fallback: number;
  max?: number;
  min?: number;
  name: string;
  value?: number | null | undefined;
}) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < min || (max !== undefined && value > max)) {
    throw new PlatformApiError({
      code: "INVALID_REQUEST",
      message:
        max === undefined
          ? `${name} must be an integer greater than or equal to ${String(min)}.`
          : `${name} must be an integer between ${String(min)} and ${String(max)}.`,
    });
  }

  return value;
}

function safeConfigurationText(configuration: Record<string, unknown>, key: string): string | null {
  const value = configuration[key];
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;
}

export function toPublicForm(form: DatabaseForm): PublicForm | null {
  if (form.deletedAt || form.status !== "published") {
    return null;
  }

  const fields = form.fields
    .filter((field) => !field.deletedAt)
    .sort((a, b) => a.fieldOrder - b.fieldOrder)
    .flatMap((field): PublicFormField[] => {
      const type = supportedPublicFieldType(field.type);
      if (!type) return [];

      return [
        {
          id: field.id,
          label: field.label,
          name: field.name,
          ...(type === "select" ? { options: field.options } : {}),
          placeholder: field.placeholder,
          required: field.required,
          type,
        },
      ];
    });

  return {
    fields,
    id: form.id,
    name: form.name,
    slug: form.slug,
    successMessage: safeConfigurationText(form.configuration, "successMessage"),
  };
}

async function requirePublicForm({
  context,
  database,
  slug,
}: {
  context: PlatformRequestContext;
  database: Database;
  slug: string;
}): Promise<PublicForm & { databaseForm: DatabaseForm }> {
  await requireEnabledModule({ context, database, moduleKey: "forms" });

  const row = await database.query.forms.findFirst({
    where: and(
      eq(forms.organizationId, context.organizationId),
      eq(forms.websiteId, context.websiteId),
      eq(forms.slug, slug),
      eq(forms.status, "published"),
      isNull(forms.deletedAt),
    ),
    with: { fields: true },
  });
  const publicForm = row ? toPublicForm(row) : null;

  if (!row || !publicForm) {
    throw new PlatformApiError({ code: "NOT_FOUND" });
  }

  return { ...publicForm, databaseForm: row };
}

export async function listPlatformForms({
  context,
  database,
  options = {},
}: {
  context: PlatformRequestContext;
  database: Database;
  options?: FormListOptions;
}): Promise<FormListResponse> {
  await requireEnabledModule({ context, database, moduleKey: "forms" });

  const page = normalizePositiveInteger({
    fallback: defaultPage,
    name: "page",
    value: options.page,
  });
  const limit = normalizePositiveInteger({
    fallback: defaultLimit,
    max: maxLimit,
    name: "limit",
    value: options.limit,
  });
  const rows = await database.query.forms.findMany({
    where: and(
      eq(forms.organizationId, context.organizationId),
      eq(forms.websiteId, context.websiteId),
      eq(forms.status, "published"),
      isNull(forms.deletedAt),
    ),
    orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
    with: { fields: true },
  });
  const items = rows.flatMap((row) => {
    const form = toPublicForm(row);
    return form ? [form] : [];
  });
  const offset = (page - 1) * limit;
  const pageItems = items.slice(offset, offset + limit);
  const totalPages = Math.ceil(items.length / limit);

  return {
    items: pageItems,
    pagination: {
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      limit,
      page,
      total: items.length,
      totalPages,
    },
  };
}

export async function getPlatformFormBySlug({
  context,
  database,
  slug,
}: {
  context: PlatformRequestContext;
  database: Database;
  slug: string;
}): Promise<FormResponse> {
  const form = await requirePublicForm({ context, database, slug });

  return {
    form: {
      fields: form.fields,
      id: form.id,
      name: form.name,
      slug: form.slug,
      successMessage: form.successMessage,
    },
  };
}

function normalizeString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new PlatformApiError({
      code: "INVALID_REQUEST",
      message: `${fieldName} must be a text value.`,
    });
  }

  return String(value).trim().slice(0, maxStringLength);
}

function validateSubmittedFields({
  fields,
  payload,
}: {
  fields: PublicFormField[];
  payload: FormSubmitRequest["fields"];
}) {
  if (Object.keys(payload).length > maxFieldCount) {
    throw new PlatformApiError({
      code: "INVALID_REQUEST",
      message: "Too many form fields were submitted.",
    });
  }

  const fieldByName = new Map(fields.map((field) => [field.name, field]));
  const normalized: Record<string, PublicSubmissionValue> = {};

  for (const key of Object.keys(payload)) {
    if (!fieldByName.has(key)) {
      throw new PlatformApiError({
        code: "INVALID_REQUEST",
        message: `Unknown field "${key}" was submitted.`,
      });
    }
  }

  for (const field of fields) {
    const value = payload[field.name];
    const missing =
      value === undefined ||
      value === "" ||
      value === false ||
      (Array.isArray(value) && value.length === 0);

    if (field.required && missing) {
      throw new PlatformApiError({
        code: "INVALID_REQUEST",
        message: `${field.name} is required.`,
      });
    }

    if (value === undefined || value === "") continue;

    if (field.type === "checkbox") {
      if (typeof value !== "boolean") {
        throw new PlatformApiError({
          code: "INVALID_REQUEST",
          message: `${field.name} must be true or false.`,
        });
      }
      normalized[field.name] = value;
      continue;
    }

    const stringValue = normalizeString(value, field.name);

    if (field.type === "email" && !emailPattern.test(stringValue)) {
      throw new PlatformApiError({
        code: "INVALID_REQUEST",
        message: `${field.name} must be a valid email address.`,
      });
    }

    if (field.type === "select") {
      const allowed = new Set((field.options ?? []).map((option) => option.value));
      if (!allowed.has(stringValue)) {
        throw new PlatformApiError({
          code: "INVALID_REQUEST",
          message: `${field.name} must match one of the configured options.`,
        });
      }
    }

    normalized[field.name] = stringValue;
  }

  return normalized;
}

export async function parseFormSubmissionBody(request: Request): Promise<FormSubmitRequest> {
  const text = await request.text();
  const byteLength = new TextEncoder().encode(text).length;

  if (byteLength > maxBodyBytes) {
    throw new PlatformApiError({
      code: "INVALID_REQUEST",
      message: "Submission payload is too large.",
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new PlatformApiError({
      code: "INVALID_REQUEST",
      message: "Submission body must be valid JSON.",
    });
  }

  const parsed = formSubmitRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new PlatformApiError({
      code: "INVALID_REQUEST",
      message: "Submission body does not match the expected shape.",
    });
  }

  return parsed.data;
}

function sourceFromRequest({
  context,
  request,
}: {
  context: PlatformRequestContext;
  request: Request;
}) {
  const path = request.headers.get("x-sharoz-form-path")?.slice(0, 500);
  const referrer = request.headers.get("referer")?.slice(0, 500);
  const userAgent = request.headers.get("user-agent")?.slice(0, 500);

  return {
    environmentId: context.environmentId,
    environmentType: context.environmentType,
    ...(path ? { path } : {}),
    ...(referrer ? { referrer } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

export async function submitPlatformForm({
  context,
  database,
  input,
  request,
  slug,
}: {
  context: PlatformRequestContext;
  database: Database;
  input: FormSubmitRequest;
  request: Request;
  slug: string;
}): Promise<FormSubmitResponse> {
  const form = await requirePublicForm({ context, database, slug });
  const normalized = validateSubmittedFields({ fields: form.fields, payload: input.fields });
  const submittedAt = new Date();
  const [submission] = await database
    .insert(formSubmissions)
    .values({
      data: normalized,
      formId: form.id,
      organizationId: context.organizationId,
      source: sourceFromRequest({ context, request }),
      submittedAt,
      websiteId: context.websiteId,
    })
    .returning({
      id: formSubmissions.id,
      submittedAt: formSubmissions.submittedAt,
    });

  if (!submission) {
    throw new PlatformApiError({ code: "INTERNAL_ERROR" });
  }

  return {
    submissionId: submission.id,
    submittedAt: submission.submittedAt.toISOString(),
  };
}
