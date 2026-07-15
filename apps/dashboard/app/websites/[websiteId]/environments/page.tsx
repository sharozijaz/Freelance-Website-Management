import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import { listWebsiteEnvironments, updateWebsiteEnvironment } from "@/lib/dashboard/environments";
import { getDashboardSessionContext } from "@/lib/session";
import { EnvironmentSecurityClient } from "./environment-security-client";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export const metadata = {
  title: "Website Environments",
};

export default async function WebsiteEnvironmentsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Environments">
        <UnauthorizedState message="Sign in to manage website environments." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const request = createDashboardRequest(context);
  const { environments, website } = await listWebsiteEnvironments({ database, request, websiteId });
  const securityEnvironments = environments.map((environment) => ({
    baseUrl: environment.baseUrl,
    id: environment.id,
    name: environment.name,
    previewAccessConfigured: environment.previewAccessConfigured,
    previewAccessTokenRotatedAt: environment.previewAccessTokenRotatedAt?.toISOString() ?? null,
    stagingAccessEnabled: environment.stagingAccessEnabled,
    stagingAccessSecretConfigured: environment.stagingAccessSecretConfigured,
    stagingAccessSecretRotatedAt: environment.stagingAccessSecretRotatedAt?.toISOString() ?? null,
    status: environment.status,
    type: environment.type,
  }));

  async function updateEnvironment(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;

    await updateWebsiteEnvironment({
      database,
      environmentId: formString(formData, "environmentId"),
      input: {
        baseUrl: formString(formData, "baseUrl"),
        name: formString(formData, "name"),
        status: formString(formData, "status"),
      },
      request: createDashboardRequest(actionContext),
      websiteId,
    });

    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/environments`);
  }

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/websites/${website.id}`}>Back to Website</Link>
        </Button>
      }
      description="Runtime boundaries for staging review and production launch."
      title={`${website.name} Environments`}
    >
      <WebsiteNavigation active="environments" productionUrl={website.productionUrl} websiteId={website.id} />

      <section className="grid gap-4 xl:grid-cols-2">
        {environments.map((environment) => (
          <Card key={environment.id}>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>{environment.name}</span>
                <Badge variant={environment.status === "active" ? "success" : "outline"}>
                  {environment.type}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <Field label="Status" value={environment.status} />
                <Field label="Base URL" value={environment.baseUrl ?? "Not configured"} />
                <Field
                  label="Last deployment"
                  value={
                    environment.lastDeployment
                      ? `${environment.lastDeployment.status} · ${formatDashboardDateTime(
                          environment.lastDeployment.completedAt,
                          "In progress",
                        )}`
                      : "No deployments"
                  }
                />
                <Field label="Updated" value={formatDashboardDateTime(environment.updatedAt)} />
              </div>

              <form action={updateEnvironment} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input name="environmentId" type="hidden" value={environment.id} />
                <div>
                  <Label htmlFor={`name-${environment.id}`}>Name</Label>
                  <Input
                    defaultValue={environment.name}
                    id={`name-${environment.id}`}
                    name="name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`baseUrl-${environment.id}`}>Base URL</Label>
                  <Input
                    defaultValue={environment.baseUrl ?? ""}
                    id={`baseUrl-${environment.id}`}
                    name="baseUrl"
                    placeholder="https://staging.example.com"
                  />
                </div>
                <div>
                  <Label htmlFor={`status-${environment.id}`}>Status</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    defaultValue={environment.status}
                    id={`status-${environment.id}`}
                    name="status"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <Button className="md:col-span-3" type="submit">
                  Save Environment
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </section>

      <EnvironmentSecurityClient environments={securityEnvironments} websiteId={website.id} />
    </DashboardPage>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  );
}
