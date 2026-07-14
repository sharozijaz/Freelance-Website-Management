import type { CollectionConfig } from "payload";
import { publishedPageAccess } from "../access";
import {
  authorField,
  featuredImageField,
  getDefaultWebsiteId,
  organizationField,
  publishFields,
  seoField,
  slugField,
} from "../fields";
import { pageBlocks } from "../blocks";
import { preparePageForSave, revalidatePageAfterChange } from "../hooks/pages";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: publishedPageAccess,
  admin: {
    defaultColumns: ["title", "slug", "_status", "organizationId", "websiteId", "publishDate"],
    useAsTitle: "title",
  },
  fields: [
    organizationField,
    {
      defaultValue: getDefaultWebsiteId,
      name: "websiteId",
      type: "text",
      admin: {
        description: "Auto-filled from CMS_DEFAULT_WEBSITE_ID or WEB_WEBSITE_ID for local editing.",
        position: "sidebar",
        readOnly: Boolean(getDefaultWebsiteId()),
      },
      index: true,
    },
    {
      name: "title",
      type: "text",
      required: true,
    },
    slugField,
    {
      name: "workflowStatus",
      type: "select",
      admin: {
        position: "sidebar",
      },
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "In Review", value: "review" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" },
      ],
      required: true,
    },
    featuredImageField,
    authorField,
    ...publishFields,
    seoField,
    {
      name: "layout",
      type: "blocks",
      admin: {
        description:
          "Compose this page using registered Starter Website Kit sections. The website renderer resolves these block types through the frontend Block Registry.",
        initCollapsed: true,
      },
      blocks: pageBlocks,
      defaultValue: [],
    },
  ],
  hooks: {
    afterChange: [revalidatePageAfterChange],
    beforeValidate: [preparePageForSave],
  },
  timestamps: true,
  versions: {
    drafts: {
      autosave: false,
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
};
