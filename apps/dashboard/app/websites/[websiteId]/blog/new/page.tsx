import Link from "next/link";
import { Button } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { BlogPostForm } from "../post-form";
import { database } from "@/lib/auth";
import { listBlogCategories, listBlogTags } from "@/lib/dashboard/blog";
import { listActiveWebsiteMediaForSelection, MediaDomainError } from "@/lib/dashboard/media";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getWebsiteDetail } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "New Blog Post",
};

export default async function NewBlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="New Blog Post">
        <UnauthorizedState message="Sign in to create Blog posts." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const query = await searchParams;
  const request = createDashboardRequest(context);
  const [detail, categories, tags, media] = await Promise.all([
    getWebsiteDetail({ database, request, websiteId }),
    listBlogCategories({ database, request, websiteId }),
    listBlogTags({ database, request, websiteId }),
    getMediaOptions({ request, websiteId }),
  ]);

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/websites/${websiteId}/blog`}>Back to Blog</Link>
        </Button>
      }
      description="Create article content. Presentation remains in the custom website."
      title={`New Post for ${detail.website.name}`}
    >
      <WebsiteNavigation active="blog" productionUrl={detail.website.productionUrl} websiteId={websiteId} />

      <BlogPostForm
        action={`/api/websites/${websiteId}/blog/posts`}
        categories={categories}
        error={typeof query.error === "string" ? query.error : null}
        media={media}
        returnTo={`/websites/${websiteId}/blog/new`}
        tags={tags}
      />
    </DashboardPage>
  );
}

async function getMediaOptions({
  request,
  websiteId,
}: {
  request: ReturnType<typeof createDashboardRequest>;
  websiteId: string;
}) {
  try {
    return await listActiveWebsiteMediaForSelection({ database, request, websiteId });
  } catch (error) {
    if (error instanceof MediaDomainError) return [];
    throw error;
  }
}
