import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@agency/ui";
import { membershipRoles, listOrganizationMembers } from "@agency/auth/organizations";
import { database } from "@/lib/auth";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Workspace Members",
};

export default async function WorkspaceMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ error?: string; invited?: string }>;
}) {
  const context = await getDashboardSessionContext();
  const { organizationId } = await params;
  const { error, invited } = await searchParams;

  if (!context) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-muted-foreground">Sign in to manage members.</p>
      </main>
    );
  }

  const members = await listOrganizationMembers({ context, database, organizationId }).catch(
    () => [],
  );

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspace Members</h1>
        <p className="text-muted-foreground">Invite and manage users for this organization.</p>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive p-3 text-destructive">{error}</p>
      ) : null}
      {invited ? (
        <p className="rounded-md border p-3 text-sm">
          Invitation created. Development invite URL: {invited}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members visible.</p>
            ) : null}
            {members.map((member) => (
              <div
                className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto]"
                key={member.id}
              >
                <div>
                  <p className="font-medium">{member.user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.role} · {member.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form
                    action={`/api/memberships/${member.id}`}
                    method="post"
                    className="flex gap-2"
                  >
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <select
                      className="rounded-md border bg-background px-2 text-sm"
                      name="role"
                      defaultValue={member.role}
                    >
                      {membershipRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <Button name="action" type="submit" value="role" variant="outline">
                      Update role
                    </Button>
                  </form>
                  <form action={`/api/memberships/${member.id}`} method="post">
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <Button
                      name="action"
                      type="submit"
                      value={member.status === "active" ? "suspend" : "reactivate"}
                      variant="outline"
                    >
                      {member.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </form>
                  <form action={`/api/memberships/${member.id}`} method="post">
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <Button name="action" type="submit" value="remove" variant="outline">
                      Remove
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invite Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={`/api/workspaces/${organizationId}/invitations`}
              className="space-y-4"
              method="post"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" required type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  className="w-full rounded-md border bg-background p-2"
                  id="role"
                  name="role"
                  defaultValue="client_admin"
                >
                  {membershipRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Create invitation</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
