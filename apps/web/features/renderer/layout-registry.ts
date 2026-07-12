import type { PayloadPage } from "@/lib/payload/types";
import type { LayoutVariant } from "./types";

export function getPageLayout(page: PayloadPage): LayoutVariant {
  if (page.slug === "home") {
    return "landing";
  }

  if (page.slug.startsWith("blog")) {
    return "blog";
  }

  return "default";
}

export function getPostLayout(): LayoutVariant {
  return "article";
}
