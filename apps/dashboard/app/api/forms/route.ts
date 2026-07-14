import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { createForm, normalizeFormField } from "@/lib/dashboard/content-ops";
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
    const websiteId = stringValue(formData, "websiteId");

    if (!websiteId) {
      throw new Error("Website is required.");
    }

    const fieldLabel = stringValue(formData, "fieldLabel");
    const fields = fieldLabel
      ? [
          normalizeFormField({
            label: fieldLabel,
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
  } catch (error) {
    const message = toSafeErrorMessage(error, "Form could not be created.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
