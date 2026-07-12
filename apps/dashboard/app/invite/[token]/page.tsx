import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@agency/ui";

export default async function InvitationAcceptancePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; accepted?: string }>;
}) {
  const { token } = await params;
  const { accepted, error } = await searchParams;

  return (
    <main className="mx-auto max-w-xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accepted ? (
            <p className="rounded-md border p-3 text-sm">
              Invitation accepted. You can now sign in and open your workspace.
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <form action="/api/invitations/accept" className="space-y-4" method="post">
            <input name="token" type="hidden" value={token} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" required type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" />
            </div>
            <Button type="submit">Accept invitation</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
