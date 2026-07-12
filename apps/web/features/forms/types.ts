export const formFieldTypes = [
  "checkbox",
  "consent",
  "email",
  "hidden",
  "phone",
  "radio",
  "select",
  "text",
  "textarea",
] as const;

export type FormFieldType = (typeof formFieldTypes)[number];

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldDefinition {
  defaultValue?: string | null;
  helpText?: string | null;
  label: string;
  name: string;
  options?: FormFieldOption[];
  placeholder?: string | null;
  required?: boolean;
  type: FormFieldType;
}

export interface WebsiteFormDefinition {
  fields: FormFieldDefinition[];
  id: string;
  name: string;
  slug?: string | null;
  successMessage?: string | null;
}

export type SubmittedFormValue = boolean | string | string[];
export type SubmittedFormData = Record<string, SubmittedFormValue>;
