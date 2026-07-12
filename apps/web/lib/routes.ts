export function normalizeSlug(slugSegments?: string[]): string {
  if (!slugSegments || slugSegments.length === 0) {
    return "home";
  }

  return slugSegments.join("/");
}

export function pagePathFromSlug(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

export function postPathFromSlug(slug: string): string {
  return `/blog/${slug}`;
}
