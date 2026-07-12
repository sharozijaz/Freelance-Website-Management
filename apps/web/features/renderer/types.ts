import type { PayloadPage, PayloadPost, SiteSettings } from "@/lib/payload/types";

export type LayoutVariant = "article" | "blog" | "default" | "landing";

export interface RenderContext {
  organizationId: string | null;
  settings: SiteSettings | null;
}

export interface PageRenderInput {
  context: RenderContext;
  page: PayloadPage;
}

export interface PostRenderInput {
  context: RenderContext;
  post: PayloadPost;
}
