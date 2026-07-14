import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import {
  addWebsiteDomain,
  getWebsiteHosting,
  recordManualDeployment,
  setPrimaryDomain,
  type DeploymentLifecycleStatus,
  upsertManualHostingConnection,
} from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function configurationString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function revalidateHostingPaths(websiteId: string) {
  revalidatePath("/domains");
  revalidatePath("/deployments");
  revalidatePath("/websites");
  revalidatePath(`/websites/${websiteId}`);
  revalidatePath(`/websites/${websiteId}/domains`);
  revalidatePath(`/websites/${websiteId}/hosting`);
  revalidatePath(`/websites/${websiteId}/launch`);
}

export default async function WebsiteHostingPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Hosting">
        <UnauthorizedState message="Sign in to manage hosting." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const request = createDashboardRequest(context);
  const hosting = await getWebsiteHosting({ database, request, websiteId });
  const manualConnection = hosting.connections.find(
    (connection) => connection.provider === "manual",
  );

  async function connectManual(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await upsertManualHostingConnection({
      database,
      input: {
        dashboardUrl: formString(formData, "dashboardUrl"),
        deploymentMethod: formString(formData, "deploymentMethod"),
        hostingProviderName: formString(formData, "hostingProviderName"),
        notes: formString(formData, "notes"),
        productionUrl: formString(formData, "productionUrl"),
      },
      request: createDashboardRequest(actionContext),
      websiteId,
    });
    revalidateHostingPaths(websiteId);
    redirect(`/websites/${websiteId}/hosting`);
  }

  async function addDomain(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await addWebsiteDomain({
      database,
      domain: formString(formData, "domain"),
      environmentId: formString(formData, "environmentId"),
      request: createDashboardRequest(actionContext),
      websiteId,
    });
    revalidateHostingPaths(websiteId);
    redirect(`/websites/${websiteId}/hosting`);
  }

  async function makePrimary(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await setPrimaryDomain({
      database,
      domainId: formString(formData, "domainId"),
      request: createDashboardRequest(actionContext),
    });
    revalidateHostingPaths(websiteId);
    redirect(`/websites/${websiteId}/hosting`);
  }

  async function recordDeployment(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await recordManualDeployment({
      database,
      input: {
        deploymentUrl: formString(formData, "deploymentUrl"),
        environmentId: formString(formData, "environmentId"),
        failureSummary: formString(formData, "failureSummary"),
        notes: formString(formData, "notes"),
        status: formString(formData, "status") as DeploymentLifecycleStatus,
      },
      request: createDashboardRequest(actionContext),
      websiteId,
    });
    revalidateHostingPaths(websiteId);
    redirect(`/websites/${websiteId}/hosting`);
  }

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}`}>Website</Link>
          </Button>
          {hosting.website.productionUrl ? (
            <Button asChild size="sm">
              <a href={hosting.website.productionUrl}>Open Live Site</a>
            </Button>
          ) : null}
        </>
      }
      description="Provider connection, deployments, domains, DNS records, and production routing."
      title={`${hosting.website.name} Hosting`}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info
          label="Deployment"
          value={hosting.website.deploymentStatus}
          tone={
            hosting.website.deploymentStatus === "ready"
              ? "success"
              : hosting.website.deploymentStatus === "failed"
                ? "error"
                : "outline"
          }
        />
        <Info label="Primary domain" value={hosting.website.primaryDomain ?? "Not set"} />
        <Info label="Production URL" value={hosting.website.productionUrl ?? "Not configured"} />
        <Info label="Connections" value={hosting.connections.length.toString()} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Manual / External Hosting</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form action={connectManual} className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="hostingProviderName">Provider name</Label>
                <Input
                  defaultValue={configurationString(
                    manualConnection?.configuration.hostingProviderName,
                  )}
                  id="hostingProviderName"
                  name="hostingProviderName"
                  required
                />
              </div>
              <div>
                <Label htmlFor="deploymentMethod">Deployment method</Label>
                <Input
                  defaultValue={manualConnection?.deploymentMethod ?? "Manual upload"}
                  id="deploymentMethod"
                  name="deploymentMethod"
                  required
                />
              </div>
              <div>
                <Label htmlFor="productionUrl">Production URL</Label>
                <Input
                  defaultValue={
                    manualConnection?.productionUrl ?? hosting.website.productionUrl ?? ""
                  }
                  id="productionUrl"
                  name="productionUrl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dashboardUrl">Provider dashboard URL</Label>
                <Input
                  defaultValue={manualConnection?.dashboardUrl ?? ""}
                  id="dashboardUrl"
                  name="dashboardUrl"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input defaultValue={manualConnection?.notes ?? ""} id="notes" name="notes" />
              </div>
              <Button className="md:col-span-2" type="submit">
                {manualConnection ? "Update Hosting Connection" : "Connect Manual Hosting"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Record Manual Deployment</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {manualConnection ? (
              <form action={recordDeployment} className="grid gap-3">
                <div>
                  <Label htmlFor="deploymentUrl">Deployment URL</Label>
                  <Input
                    defaultValue={manualConnection.productionUrl ?? ""}
                    id="deploymentUrl"
                    name="deploymentUrl"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    id="status"
                    name="status"
                  >
                    <option value="queued">Queued / planned</option>
                    <option value="deploying">Starting now</option>
                    <option value="ready">Record completed success</option>
                    <option value="failed">Record completed failure</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="deploymentEnvironmentId">Environment</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    id="deploymentEnvironmentId"
                    name="environmentId"
                  >
                    {hosting.environments.map((environment) => (
                      <option key={environment.id} value={environment.id}>
                        {environment.name} ({environment.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="failureSummary">Failure reason</Label>
                  <Input id="failureSummary" name="failureSummary" />
                </div>
                <div>
                  <Label htmlFor="deploymentNotes">Notes</Label>
                  <Input id="deploymentNotes" name="notes" />
                </div>
                <Button type="submit">Record Deployment</Button>
              </form>
            ) : (
              <EmptyState
                description="Connect manual hosting before recording a deployment."
                title="No hosting connection"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Add Domain</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form action={addDomain} className="grid gap-3">
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" name="domain" placeholder="example.com" required />
              </div>
              <div>
                <Label htmlFor="domainEnvironmentId">Environment</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  id="domainEnvironmentId"
                  name="environmentId"
                >
                  {hosting.environments.map((environment) => (
                    <option key={environment.id} value={environment.id}>
                      {environment.name} ({environment.type})
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Add Domain</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Connected Domains</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {hosting.domains.length === 0 ? (
              <EmptyState title="No domains connected" />
            ) : (
              <div className="divide-y divide-border">
                {hosting.domains.map((domain) => (
                  <div
                    className="grid gap-3 py-3 md:grid-cols-[1fr_auto_auto] md:items-center"
                    key={domain.id}
                  >
                    <div>
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/domains/${domain.id}`}
                      >
                        {domain.domain}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {domain.environment.name} · DNS {domain.dnsState} · SSL {domain.sslState} ·{" "}
                        {domain.verificationStatus}
                      </p>
                    </div>
                    <Badge variant={domain.isPrimary ? "success" : "outline"}>
                      {domain.isPrimary ? "Primary" : "Secondary"}
                    </Badge>
                    {!domain.isPrimary ? (
                      <form action={makePrimary}>
                        <input name="domainId" type="hidden" value={domain.id} />
                        <Button size="sm" type="submit" variant="outline">
                          Set Primary
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {hosting.deployments.length === 0 ? (
            <EmptyState title="No deployments recorded" />
          ) : (
            <div className="divide-y divide-border">
              {hosting.deployments.map((deployment) => (
                <div
                  className="grid gap-2 py-3 md:grid-cols-[0.7fr_0.7fr_0.7fr_1fr_0.9fr_auto] md:items-center"
                  key={deployment.id}
                >
                  <Badge variant="outline">{deployment.provider}</Badge>
                  <Badge variant="outline">{deployment.environment.name}</Badge>
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
                  <span className="break-words text-sm text-muted-foreground">
                    {deployment.deploymentUrl ?? "No URL"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDashboardDateTime(deployment.completedAt, "In progress")}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/websites/${websiteId}/deployments/${deployment.id}`}>
                      Details
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardPage>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  tone?: "error" | "outline" | "success";
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-sm font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}
