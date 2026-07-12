import type { CollectionConfig } from "payload";
import { contentAccess } from "../access";
import { organizationField, richTextField, slugField } from "../fields";

export const Authors: CollectionConfig = {
  slug: "authors",
  access: contentAccess,
  admin: {
    defaultColumns: ["name", "email", "organizationId", "updatedAt"],
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
      name: "email",
      type: "email",
    },
    {
      name: "userId",
      type: "text",
      admin: {
        description: "Optional ID of the platform user this author profile represents.",
      },
      index: true,
    },
    {
      name: "avatar",
      type: "upload",
      relationTo: "media",
    },
    richTextField("bio", "Bio"),
    {
      name: "socialLinks",
      type: "array",
      fields: [
        { name: "platform", type: "text", required: true },
        { name: "url", type: "text", required: true },
      ],
    },
  ],
  timestamps: true,
};
