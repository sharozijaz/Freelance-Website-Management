import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  archiveForm,
  createForm,
  duplicateForm,
  getFormTemplateFields,
  normalizeFormField,
  parseFormFieldDefinitions,
  permanentlyDeleteForm,
  type FormTemplate,
  updateForm,
} from "@/lib/dashboard/content-ops";
import { revalidateFormsWorkspace } from "@/lib/dashboard/revalidation";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function appendError(returnTo: string, message: string) {
  const separator = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${separator}error=${encodeURIComponent(message)}`;
}

function formFieldsFromData(formData: FormData) {
  const template = (stringValue(formData, "formTemplate") ?? "custom") as FormTemplate;
  const fieldDefinitions = stringValue(formData, "fieldDefinitions");
  const fieldLabel = stringValue(formData, "fieldLabel");

  return template === "contact" || template === "catering"
    ? getFormTemplateFields(template)
    : fieldDefinitions
      ? parseFormFieldDefinitions(fieldDefinitions)
      : fieldLabel
        ? [
            normalizeFormField({
              label: fieldLabel,
              name: stringValue(formData, "fieldName"),
              required: formData.get("fieldRequired") === "true",
              type: stringValue(formData, "fieldType") ?? "email",
            }),
          ]
        : [];
}

export async function POST(request: Request) {
  let returnTo = "/forms";

  try {
    const context = await requireDashboardSessionContext();
    const formData = await request.formData();
    const requestedReturnTo = stringValue(formData, "returnTo");
    if (requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")) {
      returnTo = requestedReturnTo;
    }

    const action = stringValue(formData, "_action");
    if (action === "archive") {
      const formId = stringValue(formData, "formId");
      if (!formId) {
        throw new Error("Form is required.");
      }

      const form = await archiveForm({
        database,
        formId,
        request: createDashboardRequest(context),
      });
      revalidateFormsWorkspace(form.websiteId, form.id);
    } else if (action === "delete") {
      const formId = stringValue(formData, "formId");
      if (!formId) {
        throw new Error("Form is required.");
      }

      const form = await permanentlyDeleteForm({
        database,
        formId,
        request: createDashboardRequest(context),
      });
      revalidateFormsWorkspace(form.websiteId, form.id);
    } else if (action === "duplicate") {
      const formId = stringValue(formData, "formId");
      if (!formId) {
        throw new Error("Form is required.");
      }

      const form = await duplicateForm({
        database,
        formId,
        request: createDashboardRequest(context),
      });
      revalidateFormsWorkspace(form.websiteId, form.id);
    } else if (action === "save") {
      const formId = stringValue(formData, "formId");
      if (!formId) {
        throw new Error("Form is required.");
      }

      const status = stringValue(formData, "status");
      if (status !== "draft" && status !== "published") {
        throw new Error("Form status must be draft or published.");
      }

      const form = await updateForm({
        database,
        formId,
        input: {
          fields: formFieldsFromData(formData),
          name: stringValue(formData, "name") ?? "",
          redirectUrl: stringValue(formData, "redirectUrl"),
          status,
          successMessage: stringValue(formData, "successMessage"),
        },
        request: createDashboardRequest(context),
      });
      revalidateFormsWorkspace(form.websiteId, form.id);
    } else {
      const websiteId = stringValue(formData, "websiteId");

      if (!websiteId) {
        throw new Error("Website is required.");
      }

      const form = await createForm({
        database,
        input: {
          fields: formFieldsFromData(formData),
          name: stringValue(formData, "name") ?? "",
          redirectUrl: stringValue(formData, "redirectUrl"),
          successMessage: stringValue(formData, "successMessage"),
          websiteId,
        },
        request: createDashboardRequest(context),
      });
      revalidateFormsWorkspace(form.websiteId, form.id);
    }
  } catch (error) {
    const message = toSafeErrorMessage(error, "Form action could not be completed.");
    redirect(appendError(returnTo, message));
  }

  redirect(returnTo);
}
