import type { CollectionConfig } from "payload";
import { contentAccess } from "../access";
import { organizationField, slugField, seoField } from "../fields";

export const Tags: CollectionConfig = {
  slug: "tags",
  access: contentAccess,
  admin: {
    defaultColumns: ["name", "slug", "organizationId", "updatedAt"],
    useAsTitle: "name",
  },
  fields: [
    organizationField,
    {
      name: "name",
      type: "text",
      required: true,
    },
    slugField,
    {
      name: "description",
      type: "textarea",
    },
    seoField,
  ],
  timestamps: true,
};
