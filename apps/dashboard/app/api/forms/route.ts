import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  archiveForm,
  createForm,
  getFormTemplateFields,
  normalizeFormField,
  parseFormFieldDefinitions,
  type FormTemplate,
} from "@/lib/dashboard/content-ops";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

      await archiveForm({
        database,
        formId,
        request: createDashboardRequest(context),
      });
    } else {
      const websiteId = stringValue(formData, "websiteId");

      if (!websiteId) {
        throw new Error("Website is required.");
      }

      const template = (stringValue(formData, "formTemplate") ?? "custom") as FormTemplate;
      const fieldDefinitions = stringValue(formData, "fieldDefinitions");
      const fieldLabel = stringValue(formData, "fieldLabel");
      const fields =
        template === "contact" || template === "catering"
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

      await createForm({
        database,
        input: {
          fields,
          name: stringValue(formData, "name") ?? "",
          redirectUrl: stringValue(formData, "redirectUrl"),
          successMessage: stringValue(formData, "successMessage"),
          websiteId,
        },
        request: createDashboardRequest(context),
      });
    }
  } catch (error) {
    const message = toSafeErrorMessage(error, "Form action could not be completed.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
