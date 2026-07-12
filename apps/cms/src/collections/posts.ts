import type { CollectionConfig } from "payload";
import { contentAccess } from "../access";
import {
  authorField,
  featuredImageField,
  organizationField,
  publishFields,
  richTextField,
  seoField,
  slugField,
} from "../fields";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: contentAccess,
  admin: {
    defaultColumns: ["title", "slug", "_status", "organizationId", "publishDate"],
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
      name: "excerpt",
      type: "textarea",
    },
    richTextField(),
    featuredImageField,
    authorField,
    {
      name: "categories",
      type: "relationship",
      hasMany: true,
      relationTo: "categories",
    },
    {
      name: "tags",
      type: "relationship",
      hasMany: true,
      relationTo: "tags",
    },
    {
      name: "readingTime",
      type: "number",
      admin: {
        description: "Estimated reading time in minutes.",
        position: "sidebar",
      },
      min: 1,
    },
    {
      name: "relatedPosts",
      type: "relationship",
      hasMany: true,
      relationTo: "posts",
    },
    ...publishFields,
    seoField,
  ],
  timestamps: true,
  versions: {
    drafts: {
      autosave: false,
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
};
