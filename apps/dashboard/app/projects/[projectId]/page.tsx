import Link from "next/link";
import { ExternalLink, ListChecks } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
} from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  getProjectCreationOptions,
  getProjectDetail,
  projectStatusLabels,
} from "@/lib/dashboard/projects";
import { presentAuditLog } from "@/lib/dashboard/activity";
import {
  dashboardDateInputValue,
  formatDashboardDate,
  formatDashboardDateTime,
} from "@/lib/dashboard/dates";
import { getDashboardSessionContext } from "@/lib/session";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Project">
        <UnauthorizedState message="Sign in to view this project." />
      </DashboardPage>
    );
  }

  const { projectId } = await params;
  const request = createDashboardRequest(context);
  const [detail, options] = await Promise.all([
    getProjectDetail({ database, projectId, request }),
    getProjectCreationOptions({ database, request }),
  ]);
  const project = detail.project;
  const metadata = project.metadata;
  const internalNotes = typeof metadata.internalNotes === "string" ? metadata.internalNotes : "";
  const activity = detail.activity.map(presentAuditLog);

  return (
    <DashboardPage
      actions={
        <>
          {project.figmaUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={project.figmaUrl}>Open Figma</a>
            </Button>
          ) : null}
          {project.website ? (
            <Button asChild size="sm">
              <Link href={`/websites/${project.website.id}`}>Open Website</Link>
            </Button>
          ) : null}
        </>
      }
      description="Delivery progress, handoff status, and connected website context."
      title={project.name}
    >
      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4" />
              Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <p className="text-sm text-muted-foreground">
              Only valid next steps are shown. This keeps the delivery workflow orderly while still
              allowing a project to move backward when needed.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">
                {projectStatusLabels[project.status as keyof typeof projectStatusLabels]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Target launch: {formatDashboardDate(project.launchTargetAt)}
              </span>
            </div>
            {detail.transitions.length === 0 ? (
              <EmptyState title="No further lifecycle transitions available" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {detail.transitions.map((status) => (
                  <form action={`/api/projects/${project.id}`} key={status} method="post">
                    <input name="action" type="hidden" value="transition" />
                    <input name="status" type="hidden" value={status} />
                    <Button size="sm" type="submit" variant="outline">
                      {projectStatusLabels[status]}
                    </Button>
                  </form>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Connected Website</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {project.website ? (
              <div className="space-y-2">
                <p className="font-medium">{project.website.name}</p>
                <p className="text-sm text-muted-foreground">
                  {project.website.primaryDomain ?? "No primary domain"}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/websites/${project.website.id}`}>Open Website Detail</Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                description="Connect a website when this project has an actual site record to manage domains, hosting, content, forms, SEO, and launches."
                title="No website connected"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Project Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form
            action={`/api/projects/${project.id}`}
            className="grid gap-3 xl:grid-cols-4"
            method="post"
          >
            <div>
              <Label htmlFor="name">Project name</Label>
              <Input defaultValue={project.name} id="name" name="name" />
            </div>
            <div>
              <Label htmlFor="figmaUrl">Figma URL</Label>
              <Input defaultValue={project.figmaUrl ?? ""} id="figmaUrl" name="figmaUrl" />
            </div>
            <div>
              <Label htmlFor="launchTargetAt">Target launch</Label>
              <Input
                defaultValue={dashboardDateInputValue(project.launchTargetAt)}
                id="launchTargetAt"
                name="launchTargetAt"
                type="date"
              />
            </div>
            <div>
              <Label htmlFor="websiteId">Website</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={project.websiteId ?? ""}
                id="websiteId"
                name="websiteId"
              >
                <option value="">No website</option>
                {options.websites
                  .filter((website) => website.organizationId === project.organizationId)
                  .map((website) => (
                    <option key={website.id} value={website.id}>
                      {website.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="xl:col-span-3">
              <Label htmlFor="internalNotes">Internal notes</Label>
              <Input defaultValue={internalNotes} id="internalNotes" name="internalNotes" />
            </div>
            <Button className="self-end" type="submit">
              Save Project
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Figma Workflow</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {project.figmaUrl ? (
              <a
                className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"
                href={project.figmaUrl}
              >
                Open Figma design <ExternalLink className="size-4" />
              </a>
            ) : (
              <EmptyState title="No Figma URL stored" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-4 pt-0">
            {activity.length === 0 ? (
              <EmptyState title="No recent project activity" />
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
      </section>
    </DashboardPage>
  );
}
