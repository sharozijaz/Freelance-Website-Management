import type { ReactNode } from "react";
import { Suspense } from "react";
import { FileText, Globe2, Images, Inbox, Send } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from "@agency/ui";
import { websiteTypeDescriptions, websiteTypeLabels, websiteTypes } from "@agency/lib/modules";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { presentAuditLog } from "@/lib/dashboard/activity";
import { getWebsiteOperationalSummary } from "@/lib/dashboard/content-ops";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import { getWebsiteDetail, projectStatusLabels } from "@/lib/dashboard/projects";
import type { DashboardRequest } from "@/lib/dashboard/types";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Website",
};

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Website">
        <UnauthorizedState message="Sign in to view this website." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const request = createDashboardRequest(context);
  const detail = await getWebsiteDetail({ database, request, websiteId });
  const { project, website } = detail;
  const activity = detail.activity.map(presentAuditLog);

  return (
    <DashboardPage
      description="Website identity, delivery context, content operations, and activity."
      title={website.name}
    >
      <WebsiteNavigation
        active="overview"
        productionUrl={website.productionUrl}
        websiteId={website.id}
        websiteName={website.name}
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <InfoCard label="Client" value={website.organization.name} />
        <InfoCard label="Type" value={websiteTypeLabels[website.websiteType]} />
        <InfoCard label="Status" value={website.status} />
        <InfoCard label="Deployment" value={website.deploymentStatus} />
        <InfoCard label="Primary domain" value={website.primaryDomain ?? "Not connected"} />
        <InfoCard
          label="Launched"
          value={formatDashboardDateTime(website.launchedAt, "Not launched")}
        />
        <InfoCard label="Slug" value={website.slug} />
        <InfoCard label="Production URL" value={website.productionUrl ?? "Not configured"} />
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Website Type</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form action={`/api/websites/${website.id}`} className="space-y-3" method="post">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <label className="text-sm font-medium" htmlFor="websiteType">
                  Integration model
                </label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={website.websiteType}
                  id="websiteType"
                  name="websiteType"
                  required
                >
                  {websiteTypes.map((websiteType) => (
                    <option key={websiteType} value={websiteType}>
                      {websiteTypeLabels[websiteType]}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Save Type</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {websiteTypeDescriptions[website.websiteType]}
            </p>
            <input name="returnTo" type="hidden" value={`/websites/${website.id}`} />
          </form>
        </CardContent>
      </Card>

      <Suspense fallback={<OperationCardsSkeleton />}>
        <WebsiteOperationCards request={request} websiteId={website.id} />
      </Suspense>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe2 className="size-4" />
              Connected Project
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {project ? (
              <div className="space-y-2">
                <p className="font-medium">{project.name}</p>
                <Badge variant="info">
                  {projectStatusLabels[project.status as keyof typeof projectStatusLabels]}
                </Badge>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`/projects/${project.id}`}>Open Project</a>
                  </Button>
                  {project.figmaUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={project.figmaUrl}>Open Figma</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState title="No project connected" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" />
              Recent Content
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-4 pt-0">
            {detail.content.length === 0 ? (
              <EmptyState title="No content records for this website" />
            ) : (
              detail.content.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 py-3"
                  key={`${item.type}-${item.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type} · {item.status}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={
                        item.type === "post"
                          ? `/websites/${website.id}/blog/${item.id}`
                          : `/websites/${website.id}`
                      }
                    >
                      {item.type === "post" ? "Edit" : "Review"}
                    </a>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-4 pt-0">
          {activity.length === 0 ? (
            <EmptyState title="No recent website activity" />
          ) : (
            activity.map((item) => (
              <div className="py-3" key={item.id}>
                <p className="text-sm font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDashboardDateTime(item.occurredAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardPage>
  );
}

async function WebsiteOperationCards({
  request,
  websiteId,
}: {
  request: DashboardRequest;
  websiteId: string;
}) {
  const operations = await getWebsiteOperationalSummary({ database, request, websiteId });

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <OperationCard
        href={`/media?websiteId=${websiteId}`}
        icon={<Images className="size-4" />}
        label="Media"
        value={operations.mediaCount.toString()}
      />
      <OperationCard
        href={`/media?websiteId=${websiteId}&type=image`}
        icon={<Images className="size-4" />}
        label="Missing Alt"
        value={operations.missingAlt.toString()}
      />
      <OperationCard
        href={`/forms?websiteId=${websiteId}`}
        icon={<Send className="size-4" />}
        label="Active Forms"
        value={operations.activeForms.toString()}
      />
      <OperationCard
        href={`/submissions?websiteId=${websiteId}&status=new`}
        icon={<Inbox className="size-4" />}
        label="Unread"
        value={operations.unreadSubmissions.toString()}
      />
      <OperationCard
        href={`/content?websiteId=${websiteId}&status=draft`}
        icon={<FileText className="size-4" />}
        label="Draft Content"
        value={operations.draftContent.toString()}
      />
    </section>
  );
}

function OperationCardsSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {["Media", "Missing Alt", "Active Forms", "Unread", "Draft Content"].map((label) => (
        <div className="rounded-lg border border-border bg-surface p-4" key={label}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Skeleton className="size-4" />
            <span>{label}</span>
          </div>
          <Skeleton className="mt-3 h-7 w-12" />
        </div>
      ))}
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-sm font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}

function OperationCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Button asChild className="h-auto justify-start p-0" variant="ghost">
      <a className="w-full rounded-lg border border-border bg-surface p-4 text-left" href={href}>
        <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="mt-2 block font-display text-2xl font-semibold">{value}</span>
      </a>
    </Button>
  );
}
