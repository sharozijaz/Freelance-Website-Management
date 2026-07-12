import { Mail, Users } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Label } from "@agency/ui";
import { membershipRoles } from "@agency/auth/organizations";
import { DashboardPage } from "@/components/dashboard-page";
import { NoActiveOrganizationState, UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getTeamOperations } from "@/lib/dashboard/queries";
import { getDashboardSessionContext } from "@/lib/session";

export default async function TeamPage() {
  const context = await getDashboardSessionContext();
  if (!context) {
    return <DashboardPage title="Team"><UnauthorizedState message="Sign in to manage team access." /></DashboardPage>;
  }

  const request = createDashboardRequest(context);
  const team = await getTeamOperations({ database, request });

  if (!team) {
    return <DashboardPage title="Team"><NoActiveOrganizationState /></DashboardPage>;
  }

  return (
    <DashboardPage
      description="Manage members and invitations for the active client workspace."
      title="Team"
    >
      {team.canManage ? (
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Invite Member</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form action={`/api/workspaces/${team.organizationId}/invitations`} className="grid gap-3 md:grid-cols-[1fr_14rem_auto]" method="post">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" required type="email" />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="role" name="role">
                  {membershipRoles.filter((role) => role !== "agency_owner").map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <input name="returnTo" type="hidden" value="/team" />
              <Button className="self-end" type="submit">Invite</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" />Members</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {team.members.length === 0 ? (
            <EmptyState title="No members found" />
          ) : (
            <div className="divide-y divide-border">
              {team.members.map((member) => (
                <div className="grid gap-3 py-3 md:grid-cols-[1fr_12rem_16rem] md:items-center" key={member.id}>
                  <div>
                    <p className="text-sm font-medium">{member.user.name ?? member.user.email}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                  <Badge variant={member.status === "active" ? "success" : "warning"}>{member.status}</Badge>
                  {team.canManage ? (
                    <form action={`/api/memberships/${member.id}`} className="flex flex-wrap gap-2" method="post">
                      <input name="organizationId" type="hidden" value={team.organizationId} />
                      <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" defaultValue={member.role} name="role">
                        {membershipRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <Button name="action" size="sm" type="submit" value="role" variant="outline">Save</Button>
                      <Button name="action" size="sm" type="submit" value={member.status === "active" ? "suspend" : "reactivate"} variant="outline">
                        {member.status === "active" ? "Suspend" : "Reactivate"}
                      </Button>
                      <Button name="action" size="sm" type="submit" value="remove" variant="outline">
                        Remove
                      </Button>
                    </form>
                  ) : (
                    <Badge variant="outline">{member.role}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base"><Mail className="size-4" />Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {team.pendingInvitations.length === 0 ? (
            <EmptyState title="No pending invitations" />
          ) : (
            <div className="divide-y divide-border">
              {team.pendingInvitations.map((invitation) => (
                <div className="grid gap-3 py-3 md:grid-cols-[1fr_10rem_auto] md:items-center" key={invitation.id}>
                  <div>
                    <p className="text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">Expires {invitation.expiresAt.toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline">{invitation.role}</Badge>
                  {team.canManage ? (
                    <form action={`/api/invitations/${invitation.id}/revoke`} method="post">
                      <input name="organizationId" type="hidden" value={team.organizationId} />
                      <input name="returnTo" type="hidden" value="/team" />
                      <Button size="sm" type="submit" variant="outline">Revoke</Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardPage>
  );
}
