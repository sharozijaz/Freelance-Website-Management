import Link from "next/link";
import { CalendarClock, ExternalLink, ListChecks } from "lucide-react";
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
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import {
  getProjectCreationOptions,
  getProjects,
  projectStatusLabels,
  projectStatuses,
} from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Projects">
        <UnauthorizedState message="Sign in to view delivery projects." />
      </DashboardPage>
    );
  }

  const request = createDashboardRequest(context);
  const params = parseDashboardSearchParams(await searchParams);
  const [projects, options] = await Promise.all([
    getProjects({ database, params, request }),
    getProjectCreationOptions({ database, request }),
  ]);

  return (
    <DashboardPage
      description="Agency delivery workflow from planning through launch."
      title="Projects"
    >
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={[...projectStatuses]}
      />

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Create Website Project</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {options.organizations.length === 0 ? (
            <EmptyState
              description="Create a client organization before starting a website project."
              title="No client workspaces available"
            />
          ) : (
            <form action="/api/projects" className="grid gap-3 xl:grid-cols-4" method="post">
              <div>
                <Label htmlFor="organizationId">Client</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  id="organizationId"
                  name="organizationId"
                  required
                >
                  {options.organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="name">Project name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="figmaUrl">Figma URL</Label>
                <Input id="figmaUrl" name="figmaUrl" type="url" />
              </div>
              <div>
                <Label htmlFor="launchTargetAt">Target launch</Label>
                <Input id="launchTargetAt" name="launchTargetAt" type="date" />
              </div>
              <div>
                <Label htmlFor="websiteId">Connected website</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  id="websiteId"
                  name="websiteId"
                >
                  <option value="">Connect later</option>
                  {options.websites.map((website) => (
                    <option key={website.id} value={website.id}>
                      {website.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="xl:col-span-2">
                <Label htmlFor="internalNotes">Internal notes</Label>
                <Input id="internalNotes" name="internalNotes" />
              </div>
              <input name="returnTo" type="hidden" value="/projects" />
              <Button className="self-end" type="submit">
                Create Project
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {projects.items.length === 0 ? (
        <EmptyState
          description="Projects will appear here when a client website delivery workflow is created."
          icon={<ListChecks className="size-5" />}
          title="No projects found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Project</span>
            <span>Client</span>
            <span>Status</span>
            <span>Target</span>
            <span>Website</span>
            <span>Open</span>
          </div>
          {projects.items.map((project) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr_auto] md:items-center"
              key={project.id}
            >
              <div>
                <p className="font-medium">{project.name}</p>
                {project.figmaUrl ? (
                  <a
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    href={project.figmaUrl}
                  >
                    Open Figma <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
              <span className="text-sm">{project.organizationName}</span>
              <Badge variant="outline">
                {projectStatusLabels[project.status as keyof typeof projectStatusLabels]}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarClock className="size-4" />
                {project.launchTargetAt?.toLocaleDateString() ?? "Not set"}
              </span>
              <span className="text-sm text-muted-foreground">
                {project.websiteName ?? "Not connected"}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/projects/${project.id}`}>Open</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
