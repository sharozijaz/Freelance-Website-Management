import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import {
  getDeploymentDetail,
  updateDeploymentStatus,
  type DeploymentLifecycleStatus,
} from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function duration(startedAt: Date | null, completedAt: Date | null) {
  if (!startedAt || !completedAt) return "Not available";
  const seconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
  if (seconds < 60) return `${seconds.toString()} seconds`;
  return `${Math.round(seconds / 60).toString()} minutes`;
}

export const metadata = {
  title: "Website Deployment",
};

export default async function WebsiteDeploymentDetailPage({
  params,
}: {
  params: Promise<{ deploymentId: string; websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Deployment">
        <UnauthorizedState message="Sign in to view this deployment." />
      </DashboardPage>
    );
  }

  const { deploymentId, websiteId } = await params;
  const request = createDashboardRequest(context);
  const deployment = await getDeploymentDetail({
    database,
    deploymentId,
    request,
    websiteId,
  });
  const terminal = ["ready", "failed", "cancelled"].includes(deployment.status);

  async function changeStatus(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await updateDeploymentStatus({
      database,
      deploymentId,
      failureSummary: formString(formData, "failureSummary"),
      request: createDashboardRequest(actionContext),
      status: formString(formData, "status") as DeploymentLifecycleStatus,
      websiteId,
    });
    revalidatePath("/deployments");
    revalidatePath(`/deployments/${deploymentId}`);
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/deployments`);
    revalidatePath(`/websites/${websiteId}/deployments/${deploymentId}`);
    revalidatePath(`/websites/${websiteId}/hosting`);
  }

  return (
    <DashboardPage
      actions={
        <>
          {deployment.deploymentUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={deployment.deploymentUrl}>Open Deployment</a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/deployments`}>Deployments</Link>
          </Button>
        </>
      }
      description="Website-scoped deployment detail and lifecycle controls."
      title={deployment.website.name}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Provider" value={deployment.provider} />
        <Info
          label="Status"
          tone={
            deployment.status === "ready"
              ? "success"
              : deployment.status === "failed"
                ? "error"
                : "warning"
          }
          value={deployment.status}
        />
        <Info label="Environment" value={deployment.environment.name} />
        <Info label="Trigger" value={deployment.safeMetadata.triggerType} />
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Release Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2">
          <Field label="Deployment URL" value={deployment.deploymentUrl ?? "Not available"} />
          <Field
            label="Source reference"
            value={deployment.safeMetadata.sourceReference ?? "Not set"}
          />
          <Field label="Commit SHA" value={deployment.safeMetadata.commitSha ?? "Not set"} />
          <Field
            label="Started"
            value={formatDashboardDateTime(deployment.startedAt, "Not started")}
          />
          <Field
            label="Completed"
            value={formatDashboardDateTime(deployment.completedAt, "Not completed")}
          />
          <Field label="Duration" value={duration(deployment.startedAt, deployment.completedAt)} />
          <Field
            label="Triggered by"
            value={deployment.triggeredBy?.email ?? "Provider, webhook, or system"}
          />
          <Field
            label="Failure reason"
            value={deployment.failureSummary ?? "No failure reported"}
          />
          <Field label="Notes" value={deployment.notes ?? "No notes"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {terminal ? (
            <p className="text-sm text-muted-foreground">
              This deployment is terminal and cannot be changed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {deployment.status === "queued" ? (
                <>
                  <form action={changeStatus}>
                    <input name="status" type="hidden" value="deploying" />
                    <Button size="sm" type="submit">
                      Mark In Progress
                    </Button>
                  </form>
                  <form action={changeStatus}>
                    <input name="status" type="hidden" value="cancelled" />
                    <Button size="sm" type="submit" variant="outline">
                      Cancel
                    </Button>
                  </form>
                </>
              ) : null}
              {deployment.status === "deploying" ? (
                <>
                  <form action={changeStatus}>
                    <input name="status" type="hidden" value="ready" />
                    <Button size="sm" type="submit">
                      Mark Succeeded
                    </Button>
                  </form>
                  <form action={changeStatus} className="flex flex-wrap items-end gap-2">
                    <input name="status" type="hidden" value="failed" />
                    <div>
                      <Label htmlFor="failureSummary">Failure reason</Label>
                      <Input id="failureSummary" name="failureSummary" />
                    </div>
                    <Button size="sm" type="submit" variant="outline">
                      Mark Failed
                    </Button>
                  </form>
                  <form action={changeStatus}>
                    <input name="status" type="hidden" value="cancelled" />
                    <Button size="sm" type="submit" variant="outline">
                      Cancel
                    </Button>
                  </form>
                </>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardPage>
  );
}

function Info({
  label,
  tone = "outline",
  value,
}: {
  label: string;
  tone?: "error" | "outline" | "success" | "warning";
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <Badge className="mt-2" variant={tone}>
          {value}
        </Badge>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{value}</p>
    </div>
  );
}
