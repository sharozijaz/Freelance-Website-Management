import type { Block, Field } from "payload";
import {
  commonBlockFields,
  ctaField,
  mediaGroupField,
  mediaSubFields,
  sectionIntroFields,
  validateUrl,
} from "./fields";

const linkArrayFields: Field[] = [
  {
    name: "label",
    type: "text",
    required: true,
  },
  {
    name: "url",
    type: "text",
    required: true,
    validate: validateUrl,
  },
];

function makeBlock(block: Omit<Block, "fields"> & { fields: Field[] }): Block {
  return {
    ...block,
    admin: {
      disableBlockName: false,
      group: "Starter Website Kit",
      ...(block.admin ?? {}),
    },
  };
}

export const pageBlocks: Block[] = [
  makeBlock({
    fields: [
      {
        name: "badge",
        type: "text",
      },
      {
        defaultValue: "Hero headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "subheadline",
        type: "textarea",
      },
      ctaField("primaryCta", "Primary CTA"),
      ctaField("secondaryCta", "Secondary CTA"),
      mediaGroupField("backgroundImage", "Background Image"),
      {
        name: "videoBackgroundUrl",
        type: "text",
        validate: validateUrl,
      },
      mediaGroupField("heroImage", "Hero Image"),
      {
        name: "trustIndicators",
        type: "array",
        fields: [
          {
            name: "label",
            type: "text",
            required: true,
          },
        ],
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Heroes",
      singular: "Hero",
    },
    slug: "hero",
  }),
  makeBlock({
    fields: [
      {
        defaultValue: "Logo cloud headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "carouselReady",
        type: "checkbox",
        defaultValue: false,
      },
      {
        name: "logos",
        type: "array",
        fields: [
          {
            name: "name",
            type: "text",
            required: true,
          },
          {
            name: "image",
            type: "group",
            fields: mediaSubFields(),
            label: "Logo",
          },
        ],
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Logo Clouds",
      singular: "Logo Cloud",
    },
    slug: "logo-cloud",
  }),
  makeBlock({
    fields: [
      ...sectionIntroFields,
      {
        name: "items",
        type: "array",
        fields: [
          {
            name: "icon",
            type: "text",
          },
          {
            name: "title",
            type: "text",
            required: true,
          },
          {
            name: "description",
            type: "textarea",
            required: true,
          },
          {
            name: "link",
            type: "group",
            fields: linkArrayFields,
          },
        ],
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Feature Grids",
      singular: "Feature Grid",
    },
    slug: "features",
  }),
  makeBlock({
    fields: [
      {
        defaultValue: "Services headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "text",
        type: "textarea",
      },
      {
        name: "items",
        type: "array",
        fields: [
          mediaGroupField("image", "Image"),
          {
            name: "title",
            type: "text",
            required: true,
          },
          {
            name: "description",
            type: "textarea",
            required: true,
          },
          ctaField("cta", "CTA"),
        ],
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Services Sections",
      singular: "Services",
    },
    slug: "services",
  }),
  makeBlock({
    fields: [
      {
        defaultValue: "Statistics headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "text",
        type: "textarea",
      },
      {
        name: "animated",
        type: "checkbox",
        defaultValue: true,
      },
      {
        name: "items",
        type: "array",
        fields: [
          {
            name: "value",
            type: "number",
            required: true,
          },
          {
            name: "suffix",
            type: "text",
          },
          {
            name: "label",
            type: "text",
            required: true,
          },
        ],
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Statistics Sections",
      singular: "Statistics",
    },
    slug: "statistics",
  }),
  makeBlock({
    fields: [
      {
        defaultValue: "Testimonials headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "text",
        type: "textarea",
      },
      {
        name: "items",
        type: "array",
        fields: [
          mediaGroupField("avatar", "Avatar"),
          {
            name: "rating",
            type: "number",
            max: 5,
            min: 1,
          },
          {
            name: "quote",
            type: "textarea",
            required: true,
          },
          {
            name: "name",
            type: "text",
            required: true,
          },
          {
            name: "company",
            type: "text",
          },
        ],
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Testimonials Sections",
      singular: "Testimonials",
    },
    slug: "testimonials",
  }),
  makeBlock({
    fields: [
      {
        defaultValue: "Pricing headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "text",
        type: "textarea",
      },
      {
        name: "plans",
        type: "array",
        fields: [
          {
            name: "name",
            type: "text",
            required: true,
          },
          {
            name: "description",
            type: "textarea",
          },
          {
            name: "price",
            type: "text",
            required: true,
          },
          {
            name: "highlighted",
            type: "checkbox",
            defaultValue: false,
          },
          {
            name: "features",
            type: "array",
            fields: [
              {
                name: "label",
                type: "text",
                required: true,
              },
            ],
          },
          ctaField("cta", "CTA"),
        ],
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Pricing Sections",
      singular: "Pricing",
    },
    slug: "pricing",
  }),
  makeBlock({
    fields: [
      {
        defaultValue: "FAQ headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "text",
        type: "textarea",
      },
      {
        name: "categoriesEnabled",
        type: "checkbox",
        defaultValue: false,
      },
      {
        name: "items",
        type: "array",
        fields: [
          {
            name: "category",
            type: "text",
          },
          {
            name: "question",
            type: "text",
            required: true,
          },
          {
            name: "answer",
            type: "textarea",
            required: true,
          },
        ],
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "FAQ Sections",
      singular: "FAQ",
    },
    slug: "faq",
  }),
  makeBlock({
    fields: [
      {
        name: "backgroundVariant",
        type: "select",
        defaultValue: "contrast",
        options: [
          { label: "Default", value: "default" },
          { label: "Muted", value: "muted" },
          { label: "Contrast", value: "contrast" },
        ],
      },
      {
        defaultValue: "CTA headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "text",
        type: "textarea",
      },
      {
        name: "buttons",
        type: "array",
        fields: linkArrayFields,
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "CTA Sections",
      singular: "CTA",
    },
    slug: "cta",
  }),
  makeBlock({
    fields: [
      mediaGroupField("logo", "Logo"),
      {
        name: "navigation",
        type: "array",
        fields: linkArrayFields,
      },
      {
        name: "socialLinks",
        type: "array",
        fields: linkArrayFields,
      },
      {
        defaultValue: "© 2026 Agency Website Platform. All rights reserved.",
        name: "copyright",
        type: "text",
        required: true,
      },
      {
        name: "contact",
        type: "textarea",
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Footers",
      singular: "Footer",
    },
    slug: "footer",
  }),
  makeBlock({
    fields: [
      {
        defaultValue: "Contact headline",
        name: "headline",
        type: "text",
        required: true,
      },
      {
        name: "text",
        type: "textarea",
      },
      {
        name: "email",
        type: "email",
      },
      {
        name: "phone",
        type: "text",
      },
      {
        admin: {
          description: "References a website form managed from the operations dashboard.",
        },
        name: "formId",
        type: "text",
      },
      ...commonBlockFields,
    ],
    labels: {
      plural: "Contact Sections",
      singular: "Contact",
    },
    slug: "contact",
  }),
];

export { validateUrl };
