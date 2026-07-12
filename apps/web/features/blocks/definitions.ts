import { baseBlockSchema } from "./schema";
import { PlaceholderBlock } from "./placeholder-block";
import { starterBlockDefinitions } from "./sections";
import type { BlockCategory, BlockDefinition, BlockType } from "./types";

interface BlockManifestItem {
  category: BlockCategory;
  icon: string;
  name: string;
  previewImagePlaceholder: string;
  type: BlockType;
}

const blockManifest = [
  {
    category: "conversion",
    icon: "panel-top",
    name: "Hero",
    previewImagePlaceholder: "/block-previews/hero.svg",
    type: "hero",
  },
  {
    category: "content",
    icon: "list-checks",
    name: "Features",
    previewImagePlaceholder: "/block-previews/features.svg",
    type: "features",
  },
  {
    category: "content",
    icon: "briefcase",
    name: "Services",
    previewImagePlaceholder: "/block-previews/services.svg",
    type: "services",
  },
  {
    category: "content",
    icon: "info",
    name: "About",
    previewImagePlaceholder: "/block-previews/about.svg",
    type: "about",
  },
  {
    category: "media",
    icon: "images",
    name: "Gallery",
    previewImagePlaceholder: "/block-previews/gallery.svg",
    type: "gallery",
  },
  {
    category: "social-proof",
    icon: "bar-chart",
    name: "Statistics",
    previewImagePlaceholder: "/block-previews/statistics.svg",
    type: "statistics",
  },
  {
    category: "social-proof",
    icon: "quote",
    name: "Testimonials",
    previewImagePlaceholder: "/block-previews/testimonials.svg",
    type: "testimonials",
  },
  {
    category: "conversion",
    icon: "badge-dollar-sign",
    name: "Pricing",
    previewImagePlaceholder: "/block-previews/pricing.svg",
    type: "pricing",
  },
  {
    category: "content",
    icon: "circle-help",
    name: "FAQ",
    previewImagePlaceholder: "/block-previews/faq.svg",
    type: "faq",
  },
  {
    category: "content",
    icon: "git-commit-horizontal",
    name: "Timeline",
    previewImagePlaceholder: "/block-previews/timeline.svg",
    type: "timeline",
  },
  {
    category: "social-proof",
    icon: "users",
    name: "Team",
    previewImagePlaceholder: "/block-previews/team.svg",
    type: "team",
  },
  {
    category: "social-proof",
    icon: "badge-check",
    name: "Logo Cloud",
    previewImagePlaceholder: "/block-previews/logo-cloud.svg",
    type: "logo-cloud",
  },
  {
    category: "content",
    icon: "newspaper",
    name: "Blog Grid",
    previewImagePlaceholder: "/block-previews/blog-grid.svg",
    type: "blog-grid",
  },
  {
    category: "content",
    icon: "type",
    name: "Rich Text",
    previewImagePlaceholder: "/block-previews/rich-text.svg",
    type: "rich-text",
  },
  {
    category: "media",
    icon: "play-square",
    name: "Video",
    previewImagePlaceholder: "/block-previews/video.svg",
    type: "video",
  },
  {
    category: "conversion",
    icon: "mouse-pointer-click",
    name: "CTA",
    previewImagePlaceholder: "/block-previews/cta.svg",
    type: "cta",
  },
  {
    category: "navigation",
    icon: "panel-bottom",
    name: "Footer",
    previewImagePlaceholder: "/block-previews/footer.svg",
    type: "footer",
  },
  {
    category: "conversion",
    icon: "mail",
    name: "Contact",
    previewImagePlaceholder: "/block-previews/contact.svg",
    type: "contact",
  },
  {
    category: "content",
    icon: "code",
    name: "Custom HTML",
    previewImagePlaceholder: "/block-previews/custom-html.svg",
    type: "custom-html",
  },
  {
    category: "layout",
    icon: "move-vertical",
    name: "Spacer",
    previewImagePlaceholder: "/block-previews/spacer.svg",
    type: "spacer",
  },
  {
    category: "layout",
    icon: "minus",
    name: "Divider",
    previewImagePlaceholder: "/block-previews/divider.svg",
    type: "divider",
  },
] satisfies BlockManifestItem[];

const starterBlockTypes = new Set(starterBlockDefinitions.map((block) => block.type));

const placeholderBlockDefinitions: BlockDefinition[] = blockManifest
  .filter((block) => !starterBlockTypes.has(block.type))
  .map((block) => ({
    ...block,
    component: PlaceholderBlock,
    id: `core.${block.type}.v1`,
    schema: baseBlockSchema,
    version: 1,
  }));

export const coreBlockDefinitions: BlockDefinition[] = [
  ...starterBlockDefinitions,
  ...placeholderBlockDefinitions,
];
