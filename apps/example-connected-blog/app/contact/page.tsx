import { redirect } from "next/navigation";
import { isSharozApiError, type PublicFormField } from "@sharoz/sdk";
import { createServerSharozClient } from "@/lib/sharoz";

export const dynamic = "force-dynamic";

async function submitContactForm(formData: FormData) {
  "use server";

  const slug = stringFormValue(formData, "formSlug");
  const fieldNames = formData.getAll("fieldName").map(String);
  const fields: Record<string, string | boolean> = {};

  for (const name of fieldNames) {
    const type = stringFormValue(formData, `type:${name}`) || "text";
    fields[name] =
      type === "checkbox" ? formData.get(name) === "on" : stringFormValue(formData, name);
  }

  try {
    await createServerSharozClient().forms.submit(slug, { fields });
  } catch (error) {
    const message =
      isSharozApiError(error) && error.code === "INVALID_REQUEST"
        ? error.message
        : "The form could not be submitted.";
    redirect(`/contact?error=${encodeURIComponent(message)}`);
  }

  redirect("/contact?submitted=1");
}

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const sharoz = createServerSharozClient();

  try {
    const { form } = await sharoz.forms.getBySlug("contact");

    return (
      <section>
        <h1>{form.name}</h1>
        <p className="muted">
          This form is rendered by the connected website from a safe Platform API contract.
        </p>
        {query.submitted === "1" ? (
          <p className="pill">{form.successMessage ?? "Thanks, your submission was received."}</p>
        ) : null}
        {typeof query.error === "string" ? <p className="pill">{query.error}</p> : null}

        <form action={submitContactForm} className="post-card">
          <input name="formSlug" type="hidden" value={form.slug} />
          {form.fields.map((field) => (
            <FormField field={field} key={field.id} />
          ))}
          <button type="submit">Send</button>
        </form>
      </section>
    );
  } catch (error) {
    if (isSharozApiError(error) && error.code === "MODULE_NOT_ENABLED") {
      return (
        <section>
          <h1>Contact</h1>
          <p className="muted">The Forms module is not enabled for this connected website.</p>
        </section>
      );
    }

    if (isSharozApiError(error) && error.code === "NOT_FOUND") {
      return (
        <section>
          <h1>Contact</h1>
          <p className="muted">No public contact form is available for this environment.</p>
        </section>
      );
    }

    throw error;
  }
}

function FormField({ field }: { field: PublicFormField }) {
  const common = {
    id: field.name,
    name: field.name,
    placeholder: field.placeholder ?? undefined,
    required: field.required,
  };

  return (
    <label>
      <span>{field.label}</span>
      <input name="fieldName" type="hidden" value={field.name} />
      <input name={`type:${field.name}`} type="hidden" value={field.type} />
      {field.type === "textarea" ? (
        <textarea {...common} />
      ) : field.type === "select" ? (
        <select {...common}>
          <option value="">Select an option</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "checkbox" ? (
        <input id={field.name} name={field.name} type="checkbox" />
      ) : (
        <input {...common} type={field.type === "tel" ? "tel" : field.type} />
      )}
    </label>
  );
}
