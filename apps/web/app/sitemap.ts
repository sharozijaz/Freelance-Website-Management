import type { MetadataRoute } from "next";
import {
  getPublishedPagesForSitemap,
  getPublishedPostsForSitemap,
  getSiteSettings,
} from "@/lib/payload/queries";
import { pagePathFromSlug, postPathFromSlug } from "@/lib/routes";
import { getWebsiteSeoDefaults, normalizeSeoMetadata, toSeoResource } from "@/lib/seo";
import { resolveTenant } from "@/lib/tenant";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = resolveTenant();
  let pages: Awaited<ReturnType<typeof getPublishedPagesForSitemap>> = [];
  let posts: Awaited<ReturnType<typeof getPublishedPostsForSitemap>> = [];
  let settings: Awaited<ReturnType<typeof getSiteSettings>> = null;

  try {
    [pages, posts, settings] = await Promise.all([
      getPublishedPagesForSitemap({
        organizationId: tenant.organizationId,
        websiteId: tenant.websiteId,
      }),
      getPublishedPostsForSitemap({ organizationId: tenant.organizationId }),
      getSiteSettings({ organizationId: tenant.organizationId }),
    ]);
  } catch (error) {
    console.warn("Generating an empty sitemap because Payload CMS is unavailable.", error);
  }

  const website = getWebsiteSeoDefaults(settings);

  return [
    ...pages.flatMap((page) => {
      const path = pagePathFromSlug(page.slug);
      const metadata = normalizeSeoMetadata({ content: toSeoResource(page), path, website });
      return metadata.robots.index && metadata.canonicalUrl
        ? [
            {
              changeFrequency: "weekly" as const,
              lastModified: page.publishDate ? new Date(page.publishDate) : undefined,
              priority: page.slug === "home" ? 1 : 0.7,
              url: metadata.canonicalUrl,
            },
          ]
        : [];
    }),
    ...posts.flatMap((post) => {
      const path = postPathFromSlug(post.slug);
      const metadata = normalizeSeoMetadata({ content: toSeoResource(post), path, website });
      return metadata.robots.index && metadata.canonicalUrl
        ? [
            {
              changeFrequency: "monthly" as const,
              lastModified: post.publishDate ? new Date(post.publishDate) : undefined,
              priority: 0.6,
              url: metadata.canonicalUrl,
            },
          ]
        : [];
    }),
  ];
}
