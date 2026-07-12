import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge, Button, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getContentOperationsV2 } from "@/lib/dashboard/content-ops";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getDashboardSessionContext } from "@/lib/session";

const cmsBaseUrl = process.env.NEXT_PUBLIC_CMS_URL ?? "http://localhost:3001";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return <DashboardPage title="Content"><UnauthorizedState message="Sign in to view content operations." /></DashboardPage>;
  }

  const request = createDashboardRequest(context);
  const rawParams = await searchParams;
  const params: ReturnType<typeof parseDashboardSearchParams> & {
    contentType: string;
    websiteId?: string;
  } = {
    ...parseDashboardSearchParams(rawParams),
    contentType: typeof rawParams.contentType === "string" ? rawParams.contentType : "all",
  };
  if (typeof rawParams.websiteId === "string") {
    params.websiteId = rawParams.websiteId;
  }
  const content = await getContentOperationsV2({ database, params, request });
  const draftCount = content.items.filter((item) => item.status === "draft").length;
  const publishedCount = content.items.filter((item) => item.status === "published").length;

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm"><a href={`${cmsBaseUrl}/admin/collections/pages/create`}>Create Page</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${cmsBaseUrl}/admin/collections/posts/create`}>Create Post</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${cmsBaseUrl}/admin`}>Open CMS</a></Button>
        </>
      }
      description="A gateway into Payload CMS content operations. Editing remains in the CMS."
      title="Content Operations"
    >
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Recent Pages & Posts</p>
          <p className="mt-2 font-display text-2xl font-semibold">{content.items.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Draft Content</p>
          <p className="mt-2 font-display text-2xl font-semibold">{draftCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Published Content</p>
          <p className="mt-2 font-display text-2xl font-semibold">{publishedCount}</p>
        </div>
      </section>

      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["draft", "published", "archived"]}
      />

      <form className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-3" method="get">
        <input name="query" type="hidden" value={params.query} />
        <input name="status" type="hidden" value={params.status} />
        <input name="sort" type="hidden" value={params.sort} />
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Content type</span>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={params.contentType}
            name="contentType"
          >
            <option value="all">All content</option>
            <option value="page">Pages</option>
            <option value="post">Posts</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Website ID</span>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={params.websiteId}
            name="websiteId"
            placeholder="Optional website filter"
          />
        </label>
        <Button className="self-end" type="submit" variant="outline">
          Apply operational filters
        </Button>
      </form>

      {content.items.length === 0 ? (
        <EmptyState
          description="Payload remains the editing system. Content records will appear here when CMS content is available to the dashboard."
          icon={<FileText className="size-5" />}
          title="No content found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[1.4fr_0.5fr_0.7fr_0.8fr_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Title</span><span>Type</span><span>Status</span><span>Updated</span><span>Action</span>
          </div>
          {content.items.map((item) => (
            <div className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1.4fr_0.5fr_0.7fr_0.8fr_auto] md:items-center" key={`${item.type}-${item.id}`}>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">/{item.slug}</p>
              </div>
              <span className="text-sm">{item.type}</span>
              <Badge variant={item.status === "published" ? "success" : "outline"}>{item.status}</Badge>
              <span className="text-sm text-muted-foreground">{item.updatedAt.toLocaleDateString()}</span>
              <Button asChild size="sm" variant="outline">
                <a href={`${cmsBaseUrl}/admin/collections/${item.type === "page" ? "pages" : "posts"}/${item.id}`}>Edit in CMS</a>
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button asChild size="sm" variant="ghost">
        <Link href="/">Return to overview</Link>
      </Button>
    </DashboardPage>
  );
}
