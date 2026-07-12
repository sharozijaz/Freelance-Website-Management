import { lexicalEditor } from "@payloadcms/richtext-lexical";
import type { Field } from "payload";

export const organizationField: Field = {
  name: "organizationId",
  type: "text",
  admin: {
    description: "Existing platform organization UUID. Used for tenant isolation.",
    position: "sidebar",
  },
  index: true,
  required: true,
};

export const slugField: Field = {
  name: "slug",
  type: "text",
  admin: {
    position: "sidebar",
  },
  index: true,
  required: true,
};

export const richTextField = (name = "content", label = "Content"): Field => ({
  name,
  type: "richText",
  editor: lexicalEditor({}),
  label,
});

export const featuredImageField: Field = {
  name: "featuredImage",
  type: "upload",
  admin: {
    position: "sidebar",
  },
  relationTo: "media",
};

export const authorField: Field = {
  name: "author",
  type: "relationship",
  admin: {
    position: "sidebar",
  },
  relationTo: "authors",
};

export const publishFields: Field[] = [
  {
    name: "publishDate",
    type: "date",
    admin: {
      date: {
        pickerAppearance: "dayAndTime",
      },
      position: "sidebar",
    },
  },
  {
    name: "scheduledPublishAt",
    type: "date",
    admin: {
      date: {
        pickerAppearance: "dayAndTime",
      },
      description: "Future publish time. Publishing automation will be wired in a later milestone.",
      position: "sidebar",
    },
  },
  {
    name: "previewUrl",
    type: "text",
    admin: {
      position: "sidebar",
      readOnly: true,
    },
  },
];

export const seoField: Field = {
  name: "seo",
  type: "group",
  fields: [
    {
      name: "metaTitle",
      type: "text",
      maxLength: 60,
    },
    {
      name: "metaDescription",
      type: "textarea",
      maxLength: 160,
    },
    {
      name: "canonicalUrl",
      type: "text",
    },
    {
      name: "socialImage",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "openGraph",
      type: "group",
      fields: [
        {
          name: "title",
          type: "text",
        },
        {
          name: "description",
          type: "textarea",
        },
        {
          name: "type",
          type: "select",
          defaultValue: "website",
          options: [
            { label: "Website", value: "website" },
            { label: "Article", value: "article" },
          ],
        },
      ],
    },
    {
      name: "twitterCard",
      type: "select",
      defaultValue: "summary_large_image",
      options: [
        { label: "Summary", value: "summary" },
        { label: "Summary Large Image", value: "summary_large_image" },
      ],
    },
    {
      name: "robots",
      type: "group",
      fields: [
        {
          name: "index",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "follow",
          type: "checkbox",
          defaultValue: true,
        },
      ],
    },
    {
      name: "schema",
      type: "json",
      admin: {
        description: "Structured data placeholder for future SEO automation.",
      },
    },
  ],
};

export const themeField: Field = {
  name: "theme",
  type: "group",
  fields: [
    { name: "primaryColor", type: "text" },
    { name: "secondaryColor", type: "text" },
    { name: "fontFamily", type: "text" },
    { name: "borderRadius", type: "text" },
    { name: "containerWidth", type: "text" },
    {
      name: "mode",
      type: "select",
      defaultValue: "system",
      options: [
        { label: "System", value: "system" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ],
    },
  ],
};

export const linkFields: Field[] = [
  {
    name: "label",
    type: "text",
    required: true,
  },
  {
    name: "url",
    type: "text",
  },
  {
    name: "page",
    type: "relationship",
    relationTo: "pages",
  },
  {
    name: "openInNewTab",
    type: "checkbox",
    defaultValue: false,
  },
];
