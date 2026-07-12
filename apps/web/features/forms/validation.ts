import { formFieldTypes, type FormFieldDefinition, type SubmittedFormData } from "./types";

export class WebsiteFormValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebsiteFormValidationError";
  }
}

export function isFormFieldType(value: string): value is FormFieldDefinition["type"] {
  return formFieldTypes.includes(value as FormFieldDefinition["type"]);
}

export function normalizeFieldName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value.toString();
  return "";
}

export function normalizeFormDefinition(input: WebsiteFormDefinitionLike) {
  const fields = input.fields
    .map((field) => {
      const name = normalizeFieldName(field.name ?? "");
      const type = field.type ?? "text";
      const label = (field.label ?? name).trim();

      if (!name || !/^[a-z][a-z0-9_]*$/.test(name)) {
        throw new WebsiteFormValidationError("A form field has an invalid name.");
      }

      if (!isFormFieldType(type)) {
        throw new WebsiteFormValidationError(`Unsupported field type "${type}".`);
      }

      return {
        defaultValue: typeof field.defaultValue === "string" ? field.defaultValue : null,
        helpText: typeof field.helpText === "string" ? field.helpText : null,
        label,
        name,
        options: Array.isArray(field.options)
          ? field.options
              .map((option) => ({
                label: option.label.trim(),
                value: option.value.trim(),
              }))
              .filter((option) => option.label && option.value)
          : [],
        placeholder: typeof field.placeholder === "string" ? field.placeholder : null,
        required: Boolean(field.required),
        type,
      };
    })
    .filter((field) => field.type !== "hidden" || field.defaultValue);

  return {
    fields,
    id: input.id,
    name: input.name ?? "Website form",
    slug: typeof input.slug === "string" ? input.slug : null,
    successMessage:
      typeof input.successMessage === "string" ? input.successMessage : "Thanks, your submission was received.",
  };
}

export function normalizeSubmissionData({
  fields,
  payload,
}: {
  fields: Pick<FormFieldDefinition, "name" | "required" | "type">[];
  payload: Record<string, unknown>;
}): SubmittedFormData {
  const allowedFields = new Set(fields.map((field) => field.name));
  const data: SubmittedFormData = {};

  for (const key of Object.keys(payload)) {
    if (key === "_hp" || key === "formId") {
      continue;
    }

    if (!allowedFields.has(key)) {
      throw new WebsiteFormValidationError(`Unknown field "${key}" was submitted.`);
    }
  }

  for (const field of fields) {
    const value = payload[field.name];
    const missing = value === undefined || value === "" || value === false;

    if (field.required && missing) {
      throw new WebsiteFormValidationError(`${field.name} is required.`);
    }

    if (value === undefined) {
      continue;
    }

    data[field.name] =
      typeof value === "boolean"
        ? value
        : Array.isArray(value)
          ? value.map(safeString).slice(0, 20)
          : safeString(value).slice(0, 5000);
  }

  return data;
}

export function validateSafeRedirect(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new WebsiteFormValidationError("Redirect URL must be a valid relative or HTTPS URL.");
  }

  if (url.protocol !== "https:") {
    throw new WebsiteFormValidationError("Redirect URL must use HTTPS.");
  }

  return url.toString();
}

interface FormFieldDefinitionLike extends Partial<Omit<FormFieldDefinition, "type">> {
  type?: string;
}

interface WebsiteFormDefinitionLike {
  fields: FormFieldDefinitionLike[];
  id: string;
  name?: string;
  slug?: string | null;
  successMessage?: string | null;
}
