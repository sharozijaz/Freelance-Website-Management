import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
} from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getClients } from "@/lib/dashboard/queries";
import { getDashboardSessionContext } from "@/lib/session";
import { formatDashboardDate } from "@/lib/dashboard/dates";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Clients">
        <UnauthorizedState message="Sign in to view clients." />
      </DashboardPage>
    );
  }

  const request = createDashboardRequest(context);
  if (!request.access.isAgencyUser) {
    return (
      <DashboardPage title="Clients">
        <UnauthorizedState message="Client listing requires an agency role." />
      </DashboardPage>
    );
  }

  const params = parseDashboardSearchParams(await searchParams);
  const clients = await getClients({ database, params, request });

  return (
    <DashboardPage
      description="Search, filter, create, and open client workspaces."
      title="Clients"
    >
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["active", "suspended", "archived"]}
      />

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Create Client Organization</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form
            action="/api/workspaces"
            className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
            method="post"
          >
            <div>
              <Label htmlFor="name">Client name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" />
            </div>
            <input name="returnTo" type="hidden" value="/clients" />
            <Button className="self-end" type="submit">
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      {clients.items.length === 0 ? (
        <EmptyState
          description="Create the first client organization to begin managing websites."
          icon={<Building2 className="size-5" />}
          title="No clients found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.8fr_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Client</span>
            <span>Status</span>
            <span>Websites</span>
            <span>Members</span>
            <span>Last activity</span>
            <span>Actions</span>
          </div>
          {clients.items.map((client) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.8fr_auto] md:items-center"
              key={client.id}
            >
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-muted-foreground">{client.slug}</p>
              </div>
              <Badge variant={client.status === "active" ? "success" : "warning"}>
                {client.status}
              </Badge>
              <span className="text-sm">{client.websiteCount}</span>
              <span className="text-sm">{client.memberCount}</span>
              <span className="text-sm text-muted-foreground">
                {formatDashboardDate(client.lastActivityAt, "No activity")}
              </span>
              <div className="flex flex-wrap gap-2">
                <form action="/api/workspaces/switch" method="post">
                  <input name="organizationId" type="hidden" value={client.id} />
                  <input name="returnTo" type="hidden" value={`/clients/${client.id}`} />
                  <Button size="sm" type="submit">
                    Open
                  </Button>
                </form>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/clients/${client.id}`}>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                {client.id === request.access.activeOrganizationId ? (
                  <Button disabled size="sm" variant="outline">
                    Active
                  </Button>
                ) : (
                  <form action={`/api/workspaces/${client.id}`} method="post">
                    <input name="action" type="hidden" value="archive" />
                    <input name="returnTo" type="hidden" value="/clients" />
                    <Button size="sm" type="submit" variant="destructive">
                      Archive
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
