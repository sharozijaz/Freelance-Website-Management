import Link from "next/link";
import { Images } from "lucide-react";
import { Badge, Button, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getMediaOperations } from "@/lib/dashboard/content-ops";
import { formatDashboardDate } from "@/lib/dashboard/dates";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getDashboardSessionContext } from "@/lib/session";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Media">
        <UnauthorizedState message="Sign in to view media operations." />
      </DashboardPage>
    );
  }

  const rawParams = await searchParams;
  const params: ReturnType<typeof parseDashboardSearchParams> & {
    type: string;
    websiteId?: string;
  } = {
    ...parseDashboardSearchParams(rawParams),
    type: typeof rawParams.type === "string" ? rawParams.type : "all",
  };
  if (typeof rawParams.websiteId === "string") {
    params.websiteId = rawParams.websiteId;
  }
  const media = await getMediaOperations({
    database,
    params,
    request: createDashboardRequest(context),
  });

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm">
          <Link href="/websites">Open Website Media</Link>
        </Button>
      }
      description="Operational view of V2 media assets scoped to accessible client websites."
      title="Media"
    >
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["image", "video", "application"]}
      />

      {media.items.length === 0 ? (
        <EmptyState
          description="Media registered through website-scoped V2 media workflows will appear here."
          icon={<Images className="size-5" />}
          title="No media found"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {media.items.map((asset) => (
            <article className="rounded-lg border border-border bg-surface p-4" key={asset.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{asset.filename}</p>
                  <p className="text-xs text-muted-foreground">{asset.mimeType}</p>
                </div>
                <Badge
                  variant={asset.mediaType === "image" && !asset.altText ? "warning" : "outline"}
                >
                  {asset.mediaType}
                </Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Website</dt>
                  <dd>{asset.websiteName ?? "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Alt text</dt>
                  <dd>{asset.altText ? "Present" : "Missing"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Size</dt>
                  <dd>
                    {asset.fileSize
                      ? `${Math.round(asset.fileSize / 1024).toString()} KB`
                      : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Uploaded</dt>
                  <dd>{formatDashboardDate(asset.uploadedAt)}</dd>
                </div>
              </dl>
              <Button asChild className="mt-4" size="sm" variant="outline">
                <Link href={asset.websiteId ? `/websites/${asset.websiteId}/media` : "/media"}>
                  Review Media
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
