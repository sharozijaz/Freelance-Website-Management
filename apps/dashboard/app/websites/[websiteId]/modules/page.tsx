import Link from "next/link";
import { Blocks, Lock } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";
import { websiteTypeLabels } from "@agency/lib/modules";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { listWebsiteModules } from "@/lib/dashboard/modules";
import { getWebsiteDetail } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

export default async function WebsiteModulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Website Modules">
        <UnauthorizedState message="Sign in to manage website modules." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;
  const request = createDashboardRequest(context);
  const [detail, moduleState] = await Promise.all([
    getWebsiteDetail({ database, request, websiteId }),
    listWebsiteModules({ database, request, websiteId }),
  ]);
  const { website } = detail;
  const canManageModules = moduleState.websiteType === "sharoz_connected";

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/websites/${website.id}`}>Back to Website</Link>
        </Button>
      }
      description="Enable backend capabilities for this website. A custom site can then use the Platform API for only the modules this client needs."
      title={`${website.name} Modules`}
    >
      {error ? (
        <Card className="border-error">
          <CardContent className="p-4 text-sm text-error">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Website type</p>
            <p className="text-sm text-muted-foreground">
              {websiteTypeLabels[moduleState.websiteType]}
            </p>
          </div>
          {!canManageModules ? (
            <Badge variant="warning">
              <Lock className="size-3" />
              Module enablement unavailable
            </Badge>
          ) : (
            <Badge variant="success">Modules available</Badge>
          )}
        </CardContent>
      </Card>

      {moduleState.modules.length === 0 ? (
        <EmptyState
          description="Available and planned platform modules will appear here as the platform grows."
          icon={<Blocks className="size-5" />}
          title="No modules registered"
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {moduleState.modules.map((module) => (
            <Card key={module.key}>
              <CardHeader className="p-4">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>{module.label}</span>
                  <Badge
                    variant={
                      module.availability === "planned"
                        ? "warning"
                        : module.enabled
                          ? "success"
                          : "outline"
                    }
                  >
                    {module.availability === "planned"
                      ? "Planned"
                      : module.enabled
                        ? "Enabled"
                        : "Available"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                <p className="text-sm text-muted-foreground">{module.description}</p>
                {module.availability === "planned" ? (
                  <p className="text-sm font-medium text-muted-foreground">
                    Roadmap module. It will become toggleable after the backend, dashboard, and
                    Platform API are implemented.
                  </p>
                ) : (
                  <form action={`/api/websites/${website.id}/modules`} method="post">
                    <input name="moduleKey" type="hidden" value={module.key} />
                    <input
                      name="action"
                      type="hidden"
                      value={module.enabled ? "disable" : "enable"}
                    />
                    <input
                      name="returnTo"
                      type="hidden"
                      value={`/websites/${website.id}/modules`}
                    />
                    <Button
                      disabled={!canManageModules}
                      size="sm"
                      type="submit"
                      variant={module.enabled ? "outline" : "primary"}
                    >
                      {module.enabled ? "Disable" : "Enable"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </DashboardPage>
  );
}
