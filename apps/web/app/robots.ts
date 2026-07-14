import type { MetadataRoute } from "next";
import { websiteBaseUrl } from "@/lib/config";
import { getSiteSettings } from "@/lib/payload/queries";
import { getWebsiteSeoDefaults } from "@/lib/seo";
import { resolveTenant } from "@/lib/tenant";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = resolveTenant();
  let settings: Awaited<ReturnType<typeof getSiteSettings>> = null;

  try {
    settings = await getSiteSettings({ organizationId: tenant.organizationId });
  } catch (error) {
    console.warn("Using default robots policy because Payload CMS is unavailable.", error);
  }

  const defaults = getWebsiteSeoDefaults(settings);
  const isPreview = process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV !== "production";

  if (isPreview || defaults.defaultRobots?.index === false) {
    return {
      rules: {
        disallow: "/",
        userAgent: "*",
      },
      sitemap: `${websiteBaseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: `${websiteBaseUrl}/sitemap.xml`,
  };
}
