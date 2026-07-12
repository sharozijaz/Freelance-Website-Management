import type { CollectionConfig } from "payload";
import { settingsAccess } from "../access";
import { organizationField, themeField } from "../fields";

export const SiteSettings: CollectionConfig = {
  slug: "site-settings",
  access: {
    create: settingsAccess.update,
    delete: settingsAccess.update,
    read: settingsAccess.read,
    update: settingsAccess.update,
  },
  admin: {
    defaultColumns: ["siteName", "organizationId", "updatedAt"],
    useAsTitle: "siteName",
  },
  fields: [
    organizationField,
    {
      name: "siteName",
      type: "text",
      required: true,
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "siteTitle", type: "text" },
        { name: "titleTemplate", type: "text" },
        { name: "defaultMetaDescription", type: "textarea" },
        { name: "canonicalBaseUrl", type: "text" },
        { name: "defaultOgImage", type: "upload", relationTo: "media" },
        { name: "siteName", type: "text" },
        { name: "locale", type: "text", defaultValue: "en_US" },
        {
          name: "defaultRobots",
          type: "group",
          fields: [
            { name: "index", type: "checkbox", defaultValue: true },
            { name: "follow", type: "checkbox", defaultValue: true },
          ],
        },
      ],
    },
    {
      name: "brand",
      type: "group",
      fields: [
        { name: "logo", type: "upload", relationTo: "media" },
        { name: "favicon", type: "upload", relationTo: "media" },
        { name: "tagline", type: "text" },
      ],
    },
    themeField,
    {
      name: "contactInformation",
      type: "group",
      fields: [
        { name: "email", type: "email" },
        { name: "phone", type: "text" },
        { name: "address", type: "textarea" },
      ],
    },
    {
      name: "socialLinks",
      type: "array",
      fields: [
        { name: "platform", type: "text", required: true },
        { name: "url", type: "text", required: true },
      ],
    },
    {
      name: "analytics",
      type: "group",
      fields: [
        { name: "googleAnalyticsId", type: "text" },
        { name: "googleTagManagerId", type: "text" },
        { name: "metaPixelId", type: "text" },
      ],
    },
  ],
  timestamps: true,
};
