import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@agency/ui";
import { listAccessibleOrganizations } from "@agency/auth/organizations";
import { getDashboardSessionContext } from "@/lib/session";
import { database } from "@/lib/auth";

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await getDashboardSessionContext();
  const { error } = await searchParams;

  if (!context) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Client Workspaces</h1>
        <p className="text-muted-foreground">Sign in to manage organizations.</p>
      </main>
    );
  }

  const organizations = await listAccessibleOrganizations({ context, database });

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Client Workspaces</h1>
        <p className="text-muted-foreground">
          Create clients, switch active workspace, and verify tenant access.
        </p>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive p-3 text-destructive">{error}</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accessible Organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accessible organizations.</p>
            ) : null}
            {organizations.map((organization) => (
              <form
                action="/api/workspaces/switch"
                className="flex items-center justify-between gap-3"
                key={organization.id}
                method="post"
              >
                <input name="organizationId" type="hidden" value={organization.id} />
                <div>
                  <p className="font-medium">{organization.name}</p>
                  <p className="text-sm text-muted-foreground">{organization.slug}</p>
                </div>
                <Button type="submit" variant="outline">
                  Open
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Create Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/api/workspaces" className="space-y-4" method="post">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" />
              </div>
              <Button type="submit">Create workspace</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
