import type { CollectionConfig } from "payload";
import { mediaAccess } from "../access";
import { organizationField } from "../fields";

export const Media: CollectionConfig = {
  slug: "media",
  access: mediaAccess,
  admin: {
    defaultColumns: ["filename", "alt", "organizationId", "folderPath", "updatedAt"],
    useAsTitle: "filename",
  },
  fields: [
    organizationField,
    {
      name: "alt",
      type: "text",
      required: true,
    },
    {
      name: "caption",
      type: "textarea",
    },
    {
      name: "folderPath",
      type: "text",
      admin: {
        description: "Logical folder path for media organization.",
      },
      index: true,
    },
    {
      name: "focalPoint",
      type: "group",
      admin: {
        description: "Image focal point used by future responsive rendering.",
      },
      fields: [
        {
          name: "x",
          type: "number",
          admin: {
            description: "Horizontal focal position from 0 to 100.",
          },
          max: 100,
          min: 0,
        },
        {
          name: "y",
          type: "number",
          admin: {
            description: "Vertical focal position from 0 to 100.",
          },
          max: 100,
          min: 0,
        },
      ],
    },
    {
      name: "metadata",
      type: "json",
      admin: {
        description: "Provider metadata, EXIF-derived values, video duration, or PDF details.",
      },
    },
  ],
  timestamps: true,
  upload: {
    adminThumbnail: "thumbnail",
    focalPoint: false,
    imageSizes: [
      {
        name: "thumbnail",
        width: 320,
      },
      {
        name: "card",
        width: 768,
      },
      {
        name: "hero",
        width: 1600,
      },
      {
        name: "full",
        width: 2400,
      },
    ],
    mimeTypes: ["image/*", "video/*", "application/pdf"],
  },
};
