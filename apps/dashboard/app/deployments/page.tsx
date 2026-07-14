import Link from "next/link";
import { Rocket } from "lucide-react";
import { Badge, Button, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getDeployments } from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";

export default async function DeploymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Deployments">
        <UnauthorizedState message="Sign in to view deployments." />
      </DashboardPage>
    );
  }

  const request = createDashboardRequest(context);
  const rawParams = await searchParams;
  const params = {
    ...parseDashboardSearchParams(rawParams),
    provider: typeof rawParams.provider === "string" ? rawParams.provider : "all",
  };
  const websiteId = typeof rawParams.websiteId === "string" ? rawParams.websiteId : undefined;
  const deployments = await getDeployments({
    database,
    params: websiteId ? { ...params, websiteId } : params,
    request,
  });

  return (
    <DashboardPage
      description="Release history for client websites. For now this is populated by manual deployment records and future provider integrations."
      title="Deployments"
    >
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["ready", "failed", "queued", "deploying", "cancelled", "unknown"]}
      />

      {deployments.items.length === 0 ? (
        <EmptyState
          description="Open a website, connect hosting, then record a deployment when you upload, publish, or release a new version."
          icon={<Rocket className="size-5" />}
          title="No deployments found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[1fr_0.8fr_0.7fr_0.7fr_0.8fr_0.9fr_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Website</span>
            <span>Client</span>
            <span>Provider</span>
            <span>Status</span>
            <span>Environment</span>
            <span>Completed</span>
            <span>Open</span>
          </div>
          {deployments.items.map((deployment) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_0.8fr_0.7fr_0.7fr_0.8fr_0.9fr_auto] md:items-center"
              key={deployment.id}
            >
              <div>
                <p className="font-medium">{deployment.websiteName}</p>
                {deployment.deploymentUrl ? (
                  <a
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    href={deployment.deploymentUrl}
                  >
                    {deployment.deploymentUrl}
                  </a>
                ) : null}
              </div>
              <span className="text-sm">{deployment.organizationName}</span>
              <Badge variant="outline">{deployment.provider}</Badge>
              <Badge
                variant={
                  deployment.status === "ready"
                    ? "success"
                    : deployment.status === "failed"
                      ? "error"
                      : "warning"
                }
              >
                {deployment.status}
              </Badge>
              <span className="text-sm text-muted-foreground">{deployment.environment}</span>
              <span className="text-sm text-muted-foreground">
                {formatDashboardDateTime(deployment.completedAt, "In progress")}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/websites/${deployment.websiteId}/deployments/${deployment.id}`}>
                  Details
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
