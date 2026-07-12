import type { CollectionConfig, Field } from "payload";
import { contentAccess } from "../access";
import { linkFields, organizationField, slugField } from "../fields";

const nestedLinkFields: Field[] = [
  ...linkFields,
  {
    name: "children",
    type: "array",
    fields: linkFields,
    maxRows: 20,
  },
];

export const Navigation: CollectionConfig = {
  slug: "navigation",
  access: contentAccess,
  admin: {
    defaultColumns: ["title", "location", "organizationId", "updatedAt"],
    useAsTitle: "title",
  },
  fields: [
    organizationField,
    {
      name: "title",
      type: "text",
      required: true,
    },
    slugField,
    {
      name: "location",
      type: "select",
      defaultValue: "header",
      options: [
        { label: "Header", value: "header" },
        { label: "Footer", value: "footer" },
        { label: "Custom", value: "custom" },
      ],
      required: true,
    },
    {
      name: "items",
      type: "array",
      fields: nestedLinkFields,
      maxRows: 50,
      required: true,
    },
  ],
  timestamps: true,
};
