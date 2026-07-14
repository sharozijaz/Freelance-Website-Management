import type { CollectionConfig } from "payload";

interface CmsAuthUser {
  role?: string | null;
}

function isCmsAdminUser(user: unknown): boolean {
  return (user as CmsAuthUser | null | undefined)?.role === "cms_admin";
}

export const CmsUsers: CollectionConfig = {
  slug: "cms-users",
  access: {
    create: () => true,
    delete: ({ req }) => isCmsAdminUser(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => isCmsAdminUser(req.user),
  },
  admin: {
    defaultColumns: ["email", "name", "role", "updatedAt"],
    useAsTitle: "email",
  },
  auth: true,
  fields: [
    {
      name: "name",
      type: "text",
    },
    {
      name: "role",
      type: "select",
      defaultValue: "cms_admin",
      options: [{ label: "CMS Admin", value: "cms_admin" }],
      required: true,
    },
  ],
  timestamps: true,
};
