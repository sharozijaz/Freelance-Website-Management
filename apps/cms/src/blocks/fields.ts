import type { Field } from "payload";

export function validateUrl(value: unknown): true | string {
  if (!value || typeof value !== "string") {
    return true;
  }

  if (
    value.startsWith("/") ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  ) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:"
      ? true
      : "URL must be http, https, mailto, tel, an anchor, or a relative path.";
  } catch {
    return "Enter a valid URL or relative path.";
  }
}

export const ctaField = (name: string, label: string): Field => ({
  name,
  type: "group",
  label,
  fields: [
    {
      name: "label",
      type: "text",
    },
    {
      name: "url",
      type: "text",
      validate: validateUrl,
    },
  ],
});

export const mediaSubFields = (): Field[] => [
  {
    name: "media",
    type: "upload",
    relationTo: "media",
  },
  {
    name: "url",
    type: "text",
    validate: validateUrl,
  },
  {
    name: "alt",
    type: "text",
  },
];

export const mediaGroupField = (name: string, label: string): Field => ({
  name,
  type: "group",
  label,
  fields: mediaSubFields(),
});

export const sectionIntroFields: Field[] = [
  {
    name: "eyebrow",
    type: "text",
  },
  {
    defaultValue: "Section headline",
    name: "headline",
    type: "text",
    required: true,
  },
  {
    name: "text",
    type: "textarea",
  },
];

export const themeOverrideFields: Field = {
  name: "theme",
  type: "group",
  admin: {
    description: "Optional block-level theme overrides consumed by the renderer.",
  },
  fields: [
    {
      name: "background",
      type: "text",
    },
    {
      name: "colorMode",
      type: "select",
      options: [
        { label: "System", value: "system" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ],
    },
    {
      name: "containerWidth",
      type: "text",
    },
    {
      name: "spacing",
      type: "text",
    },
  ],
};

export const responsiveSettingsField: Field = {
  name: "responsive",
  type: "json",
  admin: {
    description: "Future responsive controls. Stored as JSON until the visual builder ships.",
  },
};

export const blockSettingsField: Field = {
  name: "settings",
  type: "json",
  admin: {
    description: "Future block-specific rendering settings.",
  },
};

export const visibilityRulesField: Field = {
  name: "visibility",
  type: "array",
  admin: {
    description: "Future conditional visibility rules.",
  },
  fields: [
    {
      name: "field",
      type: "text",
      required: true,
    },
    {
      name: "operator",
      type: "select",
      options: [
        { label: "Equals", value: "equals" },
        { label: "Not equals", value: "not_equals" },
        { label: "Exists", value: "exists" },
      ],
      required: true,
    },
    {
      name: "value",
      type: "text",
    },
  ],
};

export const blockSeoFlagsField: Field = {
  name: "seo",
  type: "group",
  fields: [
    {
      name: "isPrimaryHeading",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "includeInTableOfContents",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "noIndexSection",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "structuredDataType",
      type: "text",
    },
  ],
};

export const animationSettingsField: Field = {
  name: "animation",
  type: "group",
  fields: [
    {
      name: "enabled",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "preset",
      type: "select",
      defaultValue: "none",
      options: [
        { label: "None", value: "none" },
        { label: "Fade", value: "fade" },
        { label: "Slide", value: "slide" },
        { label: "Scale", value: "scale" },
      ],
    },
    {
      name: "durationMs",
      type: "number",
      min: 0,
    },
    {
      name: "delayMs",
      type: "number",
      min: 0,
    },
  ],
};

export const commonBlockFields: Field[] = [
  blockSettingsField,
  themeOverrideFields,
  visibilityRulesField,
  responsiveSettingsField,
  animationSettingsField,
  blockSeoFlagsField,
];
