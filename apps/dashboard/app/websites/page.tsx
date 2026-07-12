import Link from "next/link";
import { Globe2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Label } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getWebsites } from "@/lib/dashboard/queries";
import { getProjectCreationOptions } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return <DashboardPage title="Websites"><UnauthorizedState message="Sign in to view websites." /></DashboardPage>;
  }

  const request = createDashboardRequest(context);
  const params = parseDashboardSearchParams(await searchParams);
  const [websites, options] = await Promise.all([
    getWebsites({ database, params, request }),
    getProjectCreationOptions({ database, request }),
  ]);

  return (
    <DashboardPage description="Operational website inventory across accessible workspaces." title="Websites">
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["draft", "active", "paused", "archived"]}
      />

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Create Website</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {options.organizations.length === 0 ? (
            <EmptyState
              description="Create or access a client workspace before adding a website."
              title="No client workspaces available"
            />
          ) : (
            <form action="/api/websites" className="grid gap-3 xl:grid-cols-4" method="post">
              <div>
                <Label htmlFor="organizationId">Client</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="organizationId" name="organizationId" required>
                  {options.organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="name">Website name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" />
              </div>
              <div>
                <Label htmlFor="projectId">Project</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="projectId" name="projectId">
                  <option value="">Connect later</option>
                  {options.projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="primaryDomain">Primary domain</Label>
                <Input id="primaryDomain" name="primaryDomain" />
              </div>
              <div>
                <Label htmlFor="logo">Logo URL</Label>
                <Input id="logo" name="logo" />
              </div>
              <div>
                <Label htmlFor="favicon">Favicon URL</Label>
                <Input id="favicon" name="favicon" />
              </div>
              <input name="returnTo" type="hidden" value="/websites" />
              <Button className="self-end" type="submit">Create Website</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {websites.items.length === 0 ? (
        <EmptyState icon={<Globe2 className="size-5" />} title="No websites found" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[1.1fr_0.9fr_0.7fr_0.8fr_1fr_0.7fr_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Website</span><span>Client</span><span>Status</span><span>Deployment</span><span>Domain</span><span>Updated</span><span>Open</span>
          </div>
          {websites.items.map((website) => (
            <div className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1.1fr_0.9fr_0.7fr_0.8fr_1fr_0.7fr_auto] md:items-center" key={website.id}>
              <div>
                <p className="font-medium">{website.name}</p>
                {website.productionUrl ? <Button asChild className="mt-1 px-0" size="sm" variant="ghost"><a href={website.productionUrl}>View website</a></Button> : null}
              </div>
              <span className="text-sm">{website.organizationName}</span>
              <Badge variant={website.status === "active" ? "success" : "outline"}>{website.status}</Badge>
              <Badge variant={website.deploymentStatus === "failed" ? "error" : "outline"}>{website.deploymentStatus}</Badge>
              <span className="text-sm text-muted-foreground">{website.primaryDomain ?? "No primary domain"}</span>
              <span className="text-sm text-muted-foreground">{website.updatedAt.toLocaleDateString()}</span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/websites/${website.id}`}>Open</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/websites/${website.id}/hosting`}>Hosting</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
