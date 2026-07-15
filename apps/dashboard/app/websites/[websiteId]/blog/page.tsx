import Link from "next/link";
import { FileText, Tags } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { database } from "@/lib/auth";
import { listBlogPosts, type BlogPostStatus } from "@/lib/dashboard/blog";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import { getWebsiteDetail } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Website Blog",
};

export default async function BlogPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Blog">
        <UnauthorizedState message="Sign in to manage Blog posts." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const query = await searchParams;
  const request = createDashboardRequest(context);
  const status = typeof query.status === "string" ? query.status : "all";
  const [detail, posts] = await Promise.all([
    getWebsiteDetail({ database, request, websiteId }),
    listBlogPosts({
      database,
      params: {
        page: typeof query.page === "string" ? Number(query.page) : 1,
        query: typeof query.query === "string" ? query.query : "",
        sort: typeof query.sort === "string" ? query.sort : "updated_desc",
        status: status as BlogPostStatus | "all",
      },
      request,
      websiteId,
    }),
  ]);
  const error = typeof query.error === "string" ? query.error : null;

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/blog/categories`}>Categories</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/blog/tags`}>Tags</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/websites/${websiteId}/blog/new`}>New Post</Link>
          </Button>
        </>
      }
      description="Manage article data for this connected website. The public website owns presentation."
      title={`${detail.website.name} Blog`}
    >
      <WebsiteNavigation active="blog" productionUrl={detail.website.productionUrl} websiteId={websiteId} />

      {error ? (
        <Card className="border-error">
          <CardContent className="p-4 text-sm text-error">{error}</CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]" method="get">
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={typeof query.query === "string" ? query.query : ""}
              name="query"
              placeholder="Search posts"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={status}
              name="status"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border p-4">
          {posts.items.length === 0 ? (
            <EmptyState icon={<FileText className="size-5" />} title="No Blog posts yet" />
          ) : (
            posts.items.map((post) => (
              <div
                className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_8rem_12rem_auto] md:items-center"
                key={post.id}
              >
                <div>
                  <p className="font-medium">{post.title}</p>
                  <p className="text-sm text-muted-foreground">/{post.slug}</p>
                </div>
                <Badge variant={post.status === "published" ? "success" : "outline"}>
                  {post.status}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {post.publishedAt ? formatDashboardDateTime(post.publishedAt) : "Not published"}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/websites/${websiteId}/blog/${post.id}`}>Edit</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/websites/${websiteId}`}>
              <Tags className="size-4" />
              Back to Website
            </Link>
          </Button>
        </CardContent>
      </Card>
    </DashboardPage>
  );
}
