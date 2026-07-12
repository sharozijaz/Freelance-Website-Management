import { and, asc, eq, isNull } from "drizzle-orm";
import { formFields, forms } from "@agency/database/schema";
import { database } from "@/lib/database";
import { FormRenderer } from "./form-renderer";

export async function FormById({ formId }: { formId: string }) {
  const [form] = await database
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
    .limit(1);

  if (form?.status !== "published") {
    return null;
  }

  const fields = await database
    .select()
    .from(formFields)
    .where(and(eq(formFields.formId, form.id), isNull(formFields.deletedAt)))
    .orderBy(asc(formFields.fieldOrder));

  return (
    <FormRenderer
      form={{
        fields: fields.map((field) => ({
          defaultValue: field.defaultValue,
          helpText: field.helpText,
          label: field.label,
          name: field.name,
          options: field.options,
          placeholder: field.placeholder,
          required: field.required,
          type: field.type,
        })),
        id: form.id,
        name: form.name,
        slug: form.slug,
        successMessage:
          typeof form.configuration.successMessage === "string"
            ? form.configuration.successMessage
            : null,
      }}
    />
  );
}
