import type { CollectionConfig } from "payload";
import { publishAccess } from "../access";
import { organizationField } from "../fields";

export const Redirects: CollectionConfig = {
  slug: "redirects",
  access: publishAccess,
  admin: {
    defaultColumns: ["from", "to", "statusCode", "organizationId", "isActive"],
    useAsTitle: "from",
  },
  fields: [
    organizationField,
    {
      name: "from",
      type: "text",
      required: true,
    },
    {
      name: "to",
      type: "text",
      required: true,
    },
    {
      name: "statusCode",
      type: "select",
      defaultValue: "301",
      options: [
        { label: "301 Permanent", value: "301" },
        { label: "302 Temporary", value: "302" },
      ],
      required: true,
    },
    {
      name: "isActive",
      type: "checkbox",
      defaultValue: true,
    },
  ],
  timestamps: true,
};
