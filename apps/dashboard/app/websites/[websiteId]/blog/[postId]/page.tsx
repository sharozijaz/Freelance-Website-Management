import Link from "next/link";
import { Button } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { BlogPostForm } from "../post-form";
import { database } from "@/lib/auth";
import { listBlogCategories, listBlogTags, requireBlogPostAccess } from "@/lib/dashboard/blog";
import { listActiveWebsiteMediaForSelection, MediaDomainError } from "@/lib/dashboard/media";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Blog Post",
};

export default async function EditBlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string; websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Edit Blog Post">
        <UnauthorizedState message="Sign in to edit Blog posts." />
      </DashboardPage>
    );
  }

  const { postId, websiteId } = await params;
  const query = await searchParams;
  const request = createDashboardRequest(context);
  const [post, categories, tags, media] = await Promise.all([
    requireBlogPostAccess({ database, permission: "blog:read", postId, request }),
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
      description="Edit article data. The connected website decides how this post is rendered."
      title={post.title}
    >
      <WebsiteNavigation active="blog" websiteId={websiteId} />

      <BlogPostForm
        action={`/api/blog/posts/${post.id}`}
        categories={categories}
        error={typeof query.error === "string" ? query.error : null}
        media={media}
        post={post}
        returnTo={`/websites/${websiteId}/blog/${post.id}`}
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
