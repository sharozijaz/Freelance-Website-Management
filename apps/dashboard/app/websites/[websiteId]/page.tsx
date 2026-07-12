import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, FileText, Globe2, Images, Inbox, Send } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { presentAuditLog } from "@/lib/dashboard/activity";
import { getWebsiteOperationalSummary } from "@/lib/dashboard/content-ops";
import { getWebsiteDetail, projectStatusLabels } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

const cmsBaseUrl = process.env.NEXT_PUBLIC_CMS_URL ?? "http://localhost:3001";

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
  const [detail, operations] = await Promise.all([
    getWebsiteDetail({ database, request, websiteId }),
    getWebsiteOperationalSummary({ database, request, websiteId }),
  ]);
  const { project, website } = detail;
  const activity = detail.activity.map(presentAuditLog);

  return (
    <DashboardPage
      actions={
        <>
          {website.productionUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={website.productionUrl}>Open Website</a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <a href={`${cmsBaseUrl}/admin`}>Open CMS</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${website.id}/hosting`}>Hosting</Link>
          </Button>
          <Button asChild size="sm">
            <a href={`${cmsBaseUrl}/admin/collections/pages/create`}>Create Page</a>
          </Button>
        </>
      }
      description="Website identity, delivery context, content operations, and activity."
      title={website.name}
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <InfoCard label="Client" value={website.organization.name} />
        <InfoCard label="Status" value={website.status} />
        <InfoCard label="Deployment" value={website.deploymentStatus} />
        <InfoCard label="Primary domain" value={website.primaryDomain ?? "Not connected"} />
        <InfoCard label="Slug" value={website.slug} />
        <InfoCard label="Production URL" value={website.productionUrl ?? "Not configured"} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <OperationCard
          href={`/media?websiteId=${website.id}`}
          icon={<Images className="size-4" />}
          label="Media"
          value={operations.mediaCount.toString()}
        />
        <OperationCard
          href={`/media?websiteId=${website.id}&type=image`}
          icon={<Images className="size-4" />}
          label="Missing Alt"
          value={operations.missingAlt.toString()}
        />
        <OperationCard
          href={`/forms?websiteId=${website.id}`}
          icon={<Send className="size-4" />}
          label="Active Forms"
          value={operations.activeForms.toString()}
        />
        <OperationCard
          href={`/submissions?websiteId=${website.id}&status=new`}
          icon={<Inbox className="size-4" />}
          label="Unread"
          value={operations.unreadSubmissions.toString()}
        />
        <OperationCard
          href={`/content?websiteId=${website.id}&status=draft`}
          icon={<FileText className="size-4" />}
          label="Draft Content"
          value={operations.draftContent.toString()}
        />
      </section>

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
                    <Link href={`/projects/${project.id}`}>Open Project</Link>
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
                <div className="flex items-center justify-between gap-3 py-3" key={`${item.type}-${item.id}`}>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.type} · {item.status}</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={`${cmsBaseUrl}/admin/collections/${item.type === "page" ? "pages" : "posts"}/${item.id}`}>
                      Edit <ExternalLink className="size-3" />
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
                <p className="text-xs text-muted-foreground">{item.occurredAt.toLocaleString()}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardPage>
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
      <Link className="w-full rounded-lg border border-border bg-surface p-4 text-left" href={href}>
        <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="mt-2 block font-display text-2xl font-semibold">{value}</span>
      </Link>
    </Button>
  );
}
