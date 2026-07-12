import type { CollectionConfig } from "payload";
import { contentAccess } from "../access";
import {
  authorField,
  featuredImageField,
  organizationField,
  publishFields,
  seoField,
  slugField,
} from "../fields";
import { pageBlocks } from "../blocks";
import { preparePageForSave, revalidatePageAfterChange } from "../hooks/pages";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: contentAccess,
  admin: {
    defaultColumns: ["title", "slug", "_status", "organizationId", "websiteId", "publishDate"],
    useAsTitle: "title",
  },
  fields: [
    organizationField,
    {
      name: "websiteId",
      type: "text",
      admin: {
        description:
          "Optional website UUID. Used to narrow page resolution inside an organization.",
        position: "sidebar",
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
