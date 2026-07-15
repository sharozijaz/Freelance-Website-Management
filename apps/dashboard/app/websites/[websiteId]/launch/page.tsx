import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import { getWebsiteLaunchReadiness, recordWebsiteLaunch } from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Website Launch",
};

export default async function WebsiteLaunchPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Launch">
        <UnauthorizedState message="Sign in to review launch readiness." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const request = createDashboardRequest(context);
  const readiness = await getWebsiteLaunchReadiness({
    database,
    diagnostics: true,
    request,
    websiteId,
  });

  async function recordLaunch(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await recordWebsiteLaunch({
      confirmWarnings: formData.get("confirmWarnings") === "on",
      database,
      request: createDashboardRequest(actionContext),
      websiteId,
    });
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/launch`);
  }

  const hasBlockers = readiness.blockers.length > 0;
  const hasWarnings = readiness.warnings.length > 0;

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/domains`}>Domains</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/deployments`}>Deployments</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/hosting`}>Hosting</Link>
          </Button>
        </>
      }
      description="A final launch checklist for marking the website live after domain, SSL, deployment, and production URL are ready."
      title={`${readiness.website.name} Launch`}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info
          label="Launch status"
          tone={readiness.website.launchedAt ? "success" : hasBlockers ? "error" : "warning"}
          value={readiness.website.launchedAt ? "launched" : hasBlockers ? "blocked" : "ready"}
        />
        <Info
          label="Launched"
          value={formatDashboardDateTime(readiness.website.launchedAt, "Not launched")}
        />
        <Info
          label="Primary domain"
          value={readiness.primaryDomain?.domain ?? readiness.website.primaryDomain ?? "Not set"}
        />
        <Info
          label="Production deployment"
          tone={readiness.latestProductionDeployment?.status === "ready" ? "success" : "warning"}
          value={readiness.latestProductionDeployment?.status ?? "missing"}
        />
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Production Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2">
          <Field
            label="Production environment"
            value={readiness.productionEnvironment?.name ?? "Missing"}
          />
          <Field
            label="Production URL"
            value={readiness.website.productionUrl ?? "Not configured"}
          />
          <Field label="DNS" value={readiness.primaryDomain?.dnsState ?? "No primary domain"} />
          <Field label="SSL" value={readiness.primaryDomain?.sslState ?? "No primary domain"} />
          <Field label="Observed DNS" value={readiness.diagnostics?.dns.status ?? "Not checked"} />
          <Field label="Observed TLS" value={readiness.diagnostics?.tls.status ?? "Not checked"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Readiness Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {readiness.checks.map((check) => (
            <div className="flex gap-3 rounded-md border border-border p-3" key={check.key}>
              {check.status === "pass" ? (
                <CheckCircle2 className="mt-0.5 size-4 text-success" />
              ) : check.status === "warning" ? (
                <AlertTriangle className="mt-0.5 size-4 text-warning" />
              ) : (
                <CircleAlert className="mt-0.5 size-4 text-error" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{check.label}</p>
                  <Badge
                    variant={
                      check.status === "pass"
                        ? "success"
                        : check.status === "warning"
                          ? "warning"
                          : "error"
                    }
                  >
                    {check.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{check.message}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Record Launch</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="mb-4 text-sm text-muted-foreground">
            Launch is an agency milestone. It records that the website has gone live for the client;
            it does not deploy code by itself.
          </p>
          {readiness.website.launchedAt ? (
            <EmptyState
              description="Future production deployments do not overwrite the original launch timestamp."
              title="Launch already recorded"
            />
          ) : hasBlockers ? (
            <EmptyState
              description="Resolve every blocker above before recording launch."
              title="Launch is blocked"
            />
          ) : (
            <form action={recordLaunch} className="space-y-3">
              {hasWarnings ? (
                <label className="flex items-start gap-2 text-sm">
                  <input className="mt-1" name="confirmWarnings" type="checkbox" />
                  <span>
                    I reviewed the warnings and want to record launch without treating them as
                    blockers.
                  </span>
                </label>
              ) : null}
              <Button type="submit">Record Website Launch</Button>
            </form>
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
      <p className="mt-1 break-words text-sm">{value}</p>
    </div>
  );
}
