import type { MetadataRoute } from "next";
import { websiteBaseUrl } from "@/lib/config";
import { getSiteSettings } from "@/lib/payload/queries";
import { getWebsiteSeoDefaults } from "@/lib/seo";
import { resolveTenant } from "@/lib/tenant";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = resolveTenant();
  const settings = await getSiteSettings({ organizationId: tenant.organizationId });
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
