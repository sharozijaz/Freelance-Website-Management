import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Rocket } from "lucide-react";
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
  getDeployments,
  getWebsiteHosting,
  recordManualDeployment,
  type DeploymentLifecycleStatus,
} from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function deploymentDuration(startedAt: Date | null, completedAt: Date | null) {
  if (!startedAt || !completedAt) return "Not available";
  const seconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
  if (seconds < 60) return `${seconds.toString()}s`;
  return `${Math.round(seconds / 60).toString()}m`;
}

export const metadata = {
  title: "Website Deployments",
};

export default async function WebsiteDeploymentsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Deployments">
        <UnauthorizedState message="Sign in to manage deployments." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const request = createDashboardRequest(context);
  const [hosting, deployments] = await Promise.all([
    getWebsiteHosting({ database, request, websiteId }),
    getDeployments({
      database,
      params: { page: 1, query: "", sort: "created_desc", status: "all", websiteId },
      request,
    }),
  ]);
  const manualConnection = hosting.connections.find(
    (connection) => connection.provider === "manual",
  );

  async function recordDeployment(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await recordManualDeployment({
      database,
      input: {
        commitSha: formString(formData, "commitSha"),
        deploymentUrl: formString(formData, "deploymentUrl"),
        environmentId: formString(formData, "environmentId"),
        failureSummary: formString(formData, "failureSummary"),
        notes: formString(formData, "notes"),
        sourceReference: formString(formData, "sourceReference"),
        status: formString(formData, "status") as DeploymentLifecycleStatus,
      },
      request: createDashboardRequest(actionContext),
      websiteId,
    });
    revalidatePath("/deployments");
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/deployments`);
    revalidatePath(`/websites/${websiteId}/hosting`);
  }

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}`}>Website</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/hosting`}>Hosting</Link>
          </Button>
        </>
      }
      description="Website-scoped release history across staging and production environments."
      title={`${hosting.website.name} Deployments`}
    >
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Record Manual Deployment</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {manualConnection ? (
            <form action={recordDeployment} className="grid gap-3 xl:grid-cols-3">
              <div>
                <Label htmlFor="environmentId">Environment</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  id="environmentId"
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
                <Label htmlFor="status">Workflow</Label>
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
                <Label htmlFor="deploymentUrl">Deployment URL</Label>
                <Input
                  defaultValue={manualConnection.productionUrl ?? ""}
                  id="deploymentUrl"
                  name="deploymentUrl"
                />
              </div>
              <div>
                <Label htmlFor="sourceReference">Source reference</Label>
                <Input id="sourceReference" name="sourceReference" placeholder="main, v1.2.0" />
              </div>
              <div>
                <Label htmlFor="commitSha">Commit SHA</Label>
                <Input id="commitSha" name="commitSha" placeholder="abcdef1" />
              </div>
              <div>
                <Label htmlFor="failureSummary">Failure reason</Label>
                <Input id="failureSummary" name="failureSummary" />
              </div>
              <div className="xl:col-span-3">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button className="xl:col-span-3" type="submit">
                Record Deployment
              </Button>
            </form>
          ) : (
            <EmptyState
              description="Connect manual hosting before recording manual deployments."
              title="No manual hosting connection"
            />
          )}
        </CardContent>
      </Card>

      {deployments.items.length === 0 ? (
        <EmptyState
          description="Manual or provider-synchronized deployments for this website will appear here."
          icon={<Rocket className="size-5" />}
          title="No deployments recorded"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[0.8fr_0.7fr_0.8fr_1fr_0.9fr_0.8fr_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Environment</span>
            <span>Status</span>
            <span>Trigger</span>
            <span>Reference</span>
            <span>Started</span>
            <span>Duration</span>
            <span>Open</span>
          </div>
          {deployments.items.map((deployment) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[0.8fr_0.7fr_0.8fr_1fr_0.9fr_0.8fr_auto] md:items-center"
              key={deployment.id}
            >
              <span className="text-sm">{deployment.environment}</span>
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
              <Badge variant="outline">{deployment.safeMetadata.triggerType}</Badge>
              <span className="break-words text-sm text-muted-foreground">
                {deployment.safeMetadata.sourceReference ??
                  deployment.safeMetadata.commitSha ??
                  deployment.deploymentUrl ??
                  "No reference"}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDashboardDateTime(deployment.startedAt, "Not started")}
              </span>
              <span className="text-sm text-muted-foreground">
                {deploymentDuration(deployment.startedAt, deployment.completedAt)}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/websites/${websiteId}/deployments/${deployment.id}`}>Details</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
