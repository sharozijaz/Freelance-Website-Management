import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyContent } from "@/components/empty-content";
import { PageRenderer } from "@/features/renderer/page-renderer";
import { getAllPageSlugs, getPageBySlug, getSiteSettings } from "@/lib/payload/queries";
import { buildMetadata } from "@/lib/seo";
import { normalizeSlug, pagePathFromSlug } from "@/lib/routes";
import { resolveTenant } from "@/lib/tenant";

export const dynamicParams = true;
export const revalidate = 300;

interface PageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPageSlugs({
    organizationId: process.env.WEB_ORGANIZATION_ID ?? null,
    websiteId: process.env.WEB_WEBSITE_ID ?? null,
  });

  return slugs.map((slug) => ({
    slug: slug === "home" ? [] : slug.split("/"),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tenant = resolveTenant();
  const { slug } = await params;
  const normalizedSlug = normalizeSlug(slug);
  const [page, settings] = await Promise.all([
    getPageBySlug({
      organizationId: tenant.organizationId,
      slug: normalizedSlug,
      websiteId: tenant.websiteId,
    }),
    getSiteSettings({ organizationId: tenant.organizationId }),
  ]);

  return buildMetadata({
    content: page,
    pathname: pagePathFromSlug(normalizedSlug),
    settings,
  });
}

export default async function WebsitePage({ params }: PageProps) {
  const tenant = resolveTenant();
  const { slug } = await params;
  const normalizedSlug = normalizeSlug(slug);

  if (!tenant.organizationId) {
    return (
      <EmptyContent
        description="Set WEB_ORGANIZATION_ID to connect this reusable website template to a tenant."
        title="Tenant not configured"
      />
    );
  }

  const [page, settings] = await Promise.all([
    getPageBySlug({
      organizationId: tenant.organizationId,
      slug: normalizedSlug,
      websiteId: tenant.websiteId,
    }),
    getSiteSettings({ organizationId: tenant.organizationId }),
  ]);

  if (!page) {
    notFound();
  }

  return <PageRenderer context={{ organizationId: tenant.organizationId, settings }} page={page} />;
}
