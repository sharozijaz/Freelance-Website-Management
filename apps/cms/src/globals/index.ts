import type { GlobalConfig } from "payload";
import { can, settingsAccess } from "../access";
import { themeField } from "../fields";

export const PlatformSettings: GlobalConfig = {
  slug: "platform-settings",
  access: {
    read: can("settings:manage"),
    update: settingsAccess.update,
  },
  fields: [
    {
      name: "agencyName",
      type: "text",
      required: true,
    },
    {
      name: "defaultBrand",
      type: "group",
      fields: [
        { name: "logo", type: "upload", relationTo: "media" },
        { name: "favicon", type: "upload", relationTo: "media" },
      ],
    },
    themeField,
    {
      name: "defaultAnalytics",
      type: "group",
      fields: [
        { name: "googleAnalyticsId", type: "text" },
        { name: "googleTagManagerId", type: "text" },
      ],
    },
  ],
  versions: {
    drafts: true,
    max: 25,
  },
};

export const globals: GlobalConfig[] = [PlatformSettings];
