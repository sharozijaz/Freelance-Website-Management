import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { listBlogCategories } from "@/lib/dashboard/blog";
import { getWebsiteDetail } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Blog Categories",
};

export default async function BlogCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Blog Categories">
        <UnauthorizedState message="Sign in to manage Blog categories." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const query = await searchParams;
  const request = createDashboardRequest(context);
  const [detail, categories] = await Promise.all([
    getWebsiteDetail({ database, request, websiteId }),
    listBlogCategories({ database, request, websiteId }),
  ]);
  const returnTo = `/websites/${websiteId}/blog/categories`;

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/websites/${websiteId}/blog`}>Back to Blog</Link>
        </Button>
      }
      description="Blog categories belong only to this website's Blog domain."
      title={`${detail.website.name} Blog Categories`}
    >
      <WebsiteNavigation
        active="blog"
        productionUrl={detail.website.productionUrl}
        websiteId={websiteId}
        websiteName={detail.website.name}
      />

      {typeof query.error === "string" ? (
        <Card className="border-error">
          <CardContent className="p-4 text-sm text-error">{query.error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Create Category</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form
            action={`/api/websites/${websiteId}/blog/categories`}
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            method="post"
          >
            <input name="returnTo" type="hidden" value={returnTo} />
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              name="name"
              placeholder="Name"
              required
            />
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              name="slug"
              placeholder="Slug"
            />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border p-4">
          {categories.length === 0 ? (
            <EmptyState title="No Blog categories yet" />
          ) : (
            categories.map((category) => (
              <form
                action={`/api/blog/categories/${category.id}`}
                className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
                key={category.id}
                method="post"
              >
                <input name="returnTo" type="hidden" value={returnTo} />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={category.name}
                  name="name"
                  required
                />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={category.slug}
                  name="slug"
                />
                <Button name="action" type="submit" value="save" variant="outline">
                  Save
                </Button>
                <Button name="action" type="submit" value="delete" variant="ghost">
                  Delete
                </Button>
              </form>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardPage>
  );
}
