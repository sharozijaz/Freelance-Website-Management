import Link from "next/link";
import { Badge, Button, Card, CardContent } from "@agency/ui";
import { websiteTypeLabels } from "@agency/lib/modules";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getWebsiteDetail } from "@/lib/dashboard/projects";
import { listWebsiteCredentials } from "@/lib/dashboard/website-credentials";
import { getDashboardSessionContext } from "@/lib/session";
import { CredentialsClient } from "./credentials-client";

export const metadata = {
  title: "Developer",
};

export default async function WebsiteDeveloperPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Developer">
        <UnauthorizedState message="Sign in to manage developer credentials." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const request = createDashboardRequest(context);
  const [detail, credentials] = await Promise.all([
    getWebsiteDetail({ database, request, websiteId }),
    listWebsiteCredentials({ database, request, websiteId }),
  ]);
  const { website } = detail;
  const canManageCredentials = website.websiteType === "sharoz_connected";

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/websites/${website.id}`}>Back to Website</Link>
        </Button>
      }
      description="Server credentials for future Platform API and SDK access."
      title={`${website.name} Developer`}
    >
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Website connection</p>
            <p className="text-sm text-muted-foreground">
              Website credentials authenticate the website server, not dashboard users.
            </p>
          </div>
          <Badge variant={canManageCredentials ? "success" : "warning"}>
            {websiteTypeLabels[website.websiteType]}
          </Badge>
        </CardContent>
      </Card>

      {!canManageCredentials ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Website API credentials are only available for Sharoz Connected websites. WordPress and
            External / Legacy websites remain operationally managed in this milestone.
          </CardContent>
        </Card>
      ) : null}

      <CredentialsClient
        canManageCredentials={canManageCredentials}
        environments={credentials.environments}
        initialCredentials={credentials.credentials.map((credential) => ({
          ...credential,
          createdAt: credential.createdAt.toISOString(),
          expiresAt: credential.expiresAt?.toISOString() ?? null,
          lastUsedAt: credential.lastUsedAt?.toISOString() ?? null,
          revokedAt: credential.revokedAt?.toISOString() ?? null,
          updatedAt: credential.updatedAt.toISOString(),
        }))}
        websiteId={website.id}
      />
    </DashboardPage>
  );
}
