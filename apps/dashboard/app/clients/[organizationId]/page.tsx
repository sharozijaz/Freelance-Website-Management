import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, FileText, Globe2, ListChecks, Mail, Users } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { formatDashboardDate, formatDashboardDateTime } from "@/lib/dashboard/dates";
import { getClientWorkspaceOverview } from "@/lib/dashboard/queries";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Client Workspace",
};

export default async function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Client Workspace">
        <UnauthorizedState message="Sign in to view this workspace." />
      </DashboardPage>
    );
  }

  const { organizationId } = await params;
  const request = createDashboardRequest(context);
  const overview = await getClientWorkspaceOverview({ database, organizationId, request });

  if (!overview) {
    return (
      <DashboardPage title="Client Workspace">
        <EmptyState title="Client workspace not found" />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href="/content">Open CMS gateway</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/team">Invite member</Link>
          </Button>
        </>
      }
      description="Client-specific operations, scoped to this organization."
      title={overview.organization.name}
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel icon={<Globe2 className="size-4" />} title="Websites">
          {overview.websites.length === 0 ? (
            <EmptyState title="No websites for this client" />
          ) : (
            overview.websites.map((website) => (
              <Row
                href="/websites"
                key={website.id}
                meta={`${website.status} · ${website.primaryDomain ?? "No primary domain"}`}
                title={website.name}
              />
            ))
          )}
        </Panel>

        <Panel icon={<ListChecks className="size-4" />} title="Projects">
          <Row
            href={`/projects?organizationId=${organizationId}`}
            meta="Delivery workflows"
            title="View client projects"
          />
          <Row href="/projects" meta="Create or manage project" title="Project operations" />
        </Panel>

        <Panel icon={<FileText className="size-4" />} title="Recent Content">
          {overview.content.length === 0 ? (
            <EmptyState title="No content records yet" />
          ) : (
            overview.content.map((content) => (
              <Row
                href="/content"
                key={`${content.type}-${content.id}`}
                meta={`${content.type} · ${content.status}`}
                title={content.title}
              />
            ))
          )}
        </Panel>

        <Panel icon={<Users className="size-4" />} title="Members">
          {overview.members.length === 0 ? (
            <EmptyState title="No members yet" />
          ) : (
            overview.members.map((member) => (
              <div className="flex items-center justify-between py-3" key={member.id}>
                <div>
                  <p className="text-sm font-medium">{member.user.name ?? member.user.email}</p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                <Badge variant="outline">{member.role}</Badge>
              </div>
            ))
          )}
        </Panel>

        <Panel icon={<Mail className="size-4" />} title="Pending Invitations">
          {overview.pendingInvitations.length === 0 ? (
            <EmptyState title="No pending invitations" />
          ) : (
            overview.pendingInvitations.map((invitation) => (
              <div className="flex items-center justify-between py-3" key={invitation.id}>
                <div>
                  <p className="text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDashboardDate(invitation.expiresAt)}
                  </p>
                </div>
                <Badge variant="warning">{invitation.role}</Badge>
              </div>
            ))
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Items Requiring Attention">
          {overview.attention.length === 0 ? (
            <EmptyState title="No attention items for this client" />
          ) : (
            overview.attention.map((item) => (
              <div className="flex items-start justify-between gap-3 py-3" key={item.id}>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant={item.severity === "critical" ? "error" : "warning"}>
                  {item.severity}
                </Badge>
              </div>
            ))
          )}
        </Panel>
        <Panel title="Recent Activity">
          {overview.recentActivity.length === 0 ? (
            <EmptyState title="No recent activity" />
          ) : (
            overview.recentActivity.map((activity) => (
              <div className="py-3" key={activity.id}>
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDashboardDateTime(activity.occurredAt)}
                </p>
              </div>
            ))
          )}
        </Panel>
      </section>
    </DashboardPage>
  );
}

function Panel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-4 pt-0">{children}</CardContent>
    </Card>
  );
}

function Row({ href, meta, title }: { href: string; meta: string; title: string }) {
  return (
    <Link className="flex items-center justify-between py-3 text-sm hover:text-primary" href={href}>
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{meta}</span>
      </span>
      <ExternalLink className="size-4 text-muted-foreground" />
    </Link>
  );
}
