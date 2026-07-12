import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getDeploymentDetail } from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";

export default async function DeploymentDetailPage({
  params,
}: {
  params: Promise<{ deploymentId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return <DashboardPage title="Deployment"><UnauthorizedState message="Sign in to view this deployment." /></DashboardPage>;
  }

  const request = createDashboardRequest(context);
  const { deploymentId } = await params;
  const deployment = await getDeploymentDetail({ database, deploymentId, request });

  return (
    <DashboardPage
      actions={
        <>
          {deployment.deploymentUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={deployment.deploymentUrl}>Open Deployment</a>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href={`/websites/${deployment.websiteId}/hosting`}>Hosting</Link>
          </Button>
        </>
      }
      description="Provider-normalized deployment details, status, and audit context."
      title={deployment.website.name}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Provider" value={deployment.provider} />
        <Info label="Status" value={deployment.status} tone={deployment.status === "ready" ? "success" : deployment.status === "failed" ? "error" : "warning"} />
        <Info label="Environment" value={deployment.environment} />
        <Info label="Client" value={deployment.organization.name} />
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Release Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2">
          <Field label="Deployment URL" value={deployment.deploymentUrl ?? "Not available"} />
          <Field label="Provider deployment ID" value={deployment.providerDeploymentId ?? "Not available"} />
          <Field label="Started" value={deployment.startedAt?.toLocaleString() ?? "Not recorded"} />
          <Field label="Completed" value={deployment.completedAt?.toLocaleString() ?? "Not completed"} />
          <Field label="Triggered by" value={deployment.triggeredBy?.email ?? "Provider or system"} />
          <Field label="Failure summary" value={deployment.failureSummary ?? "No failure reported"} />
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
        <Badge className="mt-2" variant={tone}>{value}</Badge>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm">{value}</p>
    </div>
  );
}
