import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getDashboardShellData } from "@/lib/dashboard/queries";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const context = await getDashboardSessionContext();

  if (!context) {
    return (
      <DashboardPage title="Settings">
        <UnauthorizedState message="Sign in to view dashboard settings." />
      </DashboardPage>
    );
  }

  const request = createDashboardRequest(context);
  const shell = await getDashboardShellData({ database, request });
  const activeMembership = shell.activeOrganization
    ? context.memberships.find(
        (membership) =>
          membership.organizationId === shell.activeOrganization?.id &&
          membership.status === "active",
      )
    : null;

  return (
    <DashboardPage
      description="Operational context and account details for the current dashboard session."
      title="Settings"
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Account Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <SettingRow label="User" value={context.user.name ?? context.user.email} />
            <SettingRow label="Email" value={context.user.email} />
            <SettingRow label="Session" value="Active" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Workspace Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <SettingRow
              label="Workspace"
              value={shell.activeOrganization?.name ?? "Agency Overview"}
            />
            <SettingRow
              label="Role"
              value={activeMembership?.role.replaceAll("_", " ") ?? "Agency context"}
            />
            <SettingRow
              label="Accessible workspaces"
              value={String(shell.accessibleOrganizations.length)}
            />
          </CardContent>
        </Card>
      </section>

      {shell.accessibleOrganizations.length === 0 ? (
        <EmptyState
          description="No client workspaces are currently available to this account."
          title="No accessible workspaces"
        />
      ) : (
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Accessible Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-4 pt-0">
            {shell.accessibleOrganizations.map((organization) => (
              <div className="flex items-center justify-between gap-3 py-3" key={organization.id}>
                <div>
                  <p className="text-sm font-medium">{organization.name}</p>
                  <p className="text-xs text-muted-foreground">{organization.slug}</p>
                </div>
                <Badge
                  variant={organization.id === shell.activeOrganization?.id ? "info" : "outline"}
                >
                  {organization.id === shell.activeOrganization?.id ? "Active" : "Available"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </DashboardPage>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}
