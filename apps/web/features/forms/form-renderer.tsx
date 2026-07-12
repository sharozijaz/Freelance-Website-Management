import { Button, Input, Label, Textarea } from "@agency/ui";
import { normalizeFormDefinition } from "./validation";
import type { FormFieldDefinition, WebsiteFormDefinition } from "./types";
import type { ReactNode } from "react";

type FieldRenderer = (field: FormFieldDefinition) => ReactNode;

const inputClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function FieldShell({ children, field }: { children: ReactNode; field: FormFieldDefinition }) {
  if (field.type === "hidden") {
    return <>{children}</>;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
    </div>
  );
}

const fieldRegistry: Record<FormFieldDefinition["type"], FieldRenderer> = {
  checkbox: (field) => (
    <label className="flex items-center gap-2 text-sm">
      <input defaultValue="true" name={field.name} required={field.required} type="checkbox" />
      {field.label}
    </label>
  ),
  consent: (field) => (
    <label className="flex items-center gap-2 text-sm">
      <input defaultValue="true" name={field.name} required={field.required} type="checkbox" />
      {field.label}
    </label>
  ),
  email: (field) => (
    <Input
      defaultValue={field.defaultValue ?? undefined}
      id={field.name}
      name={field.name}
      placeholder={field.placeholder ?? undefined}
      required={field.required}
      type="email"
    />
  ),
  hidden: (field) => <input name={field.name} type="hidden" value={field.defaultValue ?? ""} />,
  phone: (field) => (
    <Input
      defaultValue={field.defaultValue ?? undefined}
      id={field.name}
      name={field.name}
      placeholder={field.placeholder ?? undefined}
      required={field.required}
      type="tel"
    />
  ),
  radio: (field) => (
    <fieldset className="space-y-2">
      <legend className="sr-only">{field.label}</legend>
      {(field.options ?? []).map((option) => (
        <label className="flex items-center gap-2 text-sm" key={option.value}>
          <input name={field.name} required={field.required} type="radio" value={option.value} />
          {option.label}
        </label>
      ))}
    </fieldset>
  ),
  select: (field) => (
    <select className={inputClassName} id={field.name} name={field.name} required={field.required}>
      <option value="">Select an option</option>
      {(field.options ?? []).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  text: (field) => (
    <Input
      defaultValue={field.defaultValue ?? undefined}
      id={field.name}
      name={field.name}
      placeholder={field.placeholder ?? undefined}
      required={field.required}
    />
  ),
  textarea: (field) => (
    <Textarea
      defaultValue={field.defaultValue ?? undefined}
      id={field.name}
      name={field.name}
      placeholder={field.placeholder ?? undefined}
      required={field.required}
    />
  ),
};

export function FormRenderer({ form }: { form: WebsiteFormDefinition }) {
  const normalized = normalizeFormDefinition(form);

  return (
    <form action="/api/forms/submit" className="space-y-4" method="post">
      <input name="formId" type="hidden" value={normalized.id} />
      <input aria-hidden="true" className="hidden" name="_hp" tabIndex={-1} type="text" />
      {normalized.fields.map((field) => (
        <FieldShell field={field} key={field.name}>
          {fieldRegistry[field.type](field)}
        </FieldShell>
      ))}
      <Button type="submit">Submit</Button>
    </form>
  );
}
