import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyContent } from "@/components/empty-content";
import { PostRenderer } from "@/features/renderer/post-renderer";
import { getAllPostSlugs, getPostBySlug, getSiteSettings } from "@/lib/payload/queries";
import { postPathFromSlug } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { resolveTenant } from "@/lib/tenant";

export const dynamicParams = true;
export const revalidate = 300;

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  let slugs: string[] = [];

  try {
    slugs = await getAllPostSlugs({ organizationId: process.env.WEB_ORGANIZATION_ID ?? null });
  } catch (error) {
    console.warn("Skipping static post params because Payload CMS is unavailable.", error);
  }

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const tenant = resolveTenant();
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getPostBySlug({ organizationId: tenant.organizationId, slug }),
    getSiteSettings({ organizationId: tenant.organizationId }),
  ]);

  return buildMetadata({
    content: post,
    pathname: postPathFromSlug(slug),
    settings,
  });
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const tenant = resolveTenant();
  const { slug } = await params;

  if (!tenant.organizationId) {
    return (
      <EmptyContent
        description="Set WEB_ORGANIZATION_ID to connect blog rendering to a tenant."
        title="Tenant not configured"
      />
    );
  }

  const [post, settings] = await Promise.all([
    getPostBySlug({ organizationId: tenant.organizationId, slug }),
    getSiteSettings({ organizationId: tenant.organizationId }),
  ]);

  if (!post) {
    notFound();
  }

  return <PostRenderer context={{ organizationId: tenant.organizationId, settings }} post={post} />;
}
