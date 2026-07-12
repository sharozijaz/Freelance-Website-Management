import type { ComponentType } from "react";
import type { RenderContext } from "../renderer/types";

export const blockTypes = [
  "hero",
  "features",
  "services",
  "about",
  "gallery",
  "statistics",
  "testimonials",
  "pricing",
  "faq",
  "timeline",
  "team",
  "logo-cloud",
  "blog-grid",
  "rich-text",
  "video",
  "cta",
  "footer",
  "contact",
  "custom-html",
  "spacer",
  "divider",
] as const;

export type BlockType = (typeof blockTypes)[number];

export type BlockCategory =
  "content" | "conversion" | "layout" | "media" | "navigation" | "social-proof";

export interface BlockVisibilityRule {
  field: string;
  operator: "equals" | "exists" | "not_equals";
  value?: boolean | number | string;
}

export interface BlockResponsiveSettings {
  desktop?: Record<string, unknown>;
  mobile?: Record<string, unknown>;
  tablet?: Record<string, unknown>;
}

export interface BlockAnimationSettings {
  delayMs?: number;
  durationMs?: number;
  easing?: string;
  enabled?: boolean;
  preset?: "fade" | "none" | "slide" | "scale";
}

export interface BlockSeoFlags {
  includeInTableOfContents?: boolean;
  isPrimaryHeading?: boolean;
  noIndexSection?: boolean;
  structuredDataType?: string;
}

export interface BlockThemeOverrides {
  background?: string;
  colorMode?: "dark" | "light" | "system";
  containerWidth?: string;
  spacing?: string;
}

export interface CmsBlock<TContent = Record<string, unknown>, TSettings = Record<string, unknown>> {
  animation?: BlockAnimationSettings;
  content?: TContent;
  id: string;
  responsive?: BlockResponsiveSettings;
  seo?: BlockSeoFlags;
  settings?: TSettings;
  theme?: BlockThemeOverrides;
  type: string;
  visibility?: BlockVisibilityRule[];
}

export interface BlockSchema {
  content?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface BlockComponentProps<
  TContent = Record<string, unknown>,
  TSettings = Record<string, unknown>,
> {
  block: CmsBlock<TContent, TSettings>;
  context: RenderContext;
}

export type BlockComponent<
  TContent = Record<string, unknown>,
  TSettings = Record<string, unknown>,
> = ComponentType<BlockComponentProps<TContent, TSettings>>;

export interface BlockDefinition<
  TContent = Record<string, unknown>,
  TSettings = Record<string, unknown>,
> {
  category: BlockCategory;
  component: BlockComponent<TContent, TSettings>;
  icon: string;
  id: string;
  name: string;
  previewImagePlaceholder: string;
  schema: BlockSchema;
  type: BlockType;
  version: number;
}
