import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  FileText,
  Globe2,
  ListChecks,
  Mail,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { SummaryCard } from "@/components/summary-card";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import { getAgencyOverview } from "@/lib/dashboard/queries";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Overview",
};

export default async function AgencyOverviewPage() {
  const context = await getDashboardSessionContext();

  if (!context) {
    return (
      <DashboardPage title="Overview">
        <UnauthorizedState message="Sign in to view agency operations." />
      </DashboardPage>
    );
  }

  const request = createDashboardRequest(context);
  if (!request.access.isAgencyUser) {
    return (
      <DashboardPage title="Overview">
        <UnauthorizedState message="Agency overview requires an agency role." />
      </DashboardPage>
    );
  }

  const overview = await getAgencyOverview({ database, request });

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm">
          <Link href="/clients">Open clients</Link>
        </Button>
      }
      description="Operational status across managed client workspaces."
      title="Agency Overview"
    >
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          helper="Active client workspaces"
          label="Active Clients"
          value={overview.activeClients}
        />
        <SummaryCard
          helper="Delivery workflows"
          label="Active Projects"
          value={overview.activeProjects}
        />
        <SummaryCard
          helper="Websites in the platform"
          label="Managed Websites"
          value={overview.managedWebsites}
        />
        <SummaryCard
          helper="Pages and posts not published"
          label="Draft Content"
          value={overview.draftContent}
        />
        <SummaryCard
          helper="Invitations awaiting acceptance"
          label="Pending Invitations"
          value={overview.pendingInvitations}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Items Requiring Attention</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {overview.attention.length === 0 ? (
              <EmptyState title="No operational items need attention" />
            ) : (
              <div className="divide-y divide-border">
                {overview.attention.slice(0, 8).map((item) => (
                  <div className="flex items-start gap-3 py-3" key={item.id}>
                    <AlertTriangle className="mt-0.5 size-4 text-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Badge variant={item.severity === "critical" ? "error" : "warning"}>
                      {item.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {overview.recentActivity.length === 0 ? (
              <EmptyState title="No recent activity yet" />
            ) : (
              <div className="divide-y divide-border">
                {overview.recentActivity.map((activity) => (
                  <div className="py-3" key={activity.id}>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDashboardDateTime(activity.occurredAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <QuickLink href="/clients" icon={<Building2 className="size-4" />} label="Clients" />
        <QuickLink href="/projects" icon={<ListChecks className="size-4" />} label="Projects" />
        <QuickLink href="/websites" icon={<Globe2 className="size-4" />} label="Websites" />
        <QuickLink
          href="/content"
          icon={<FileText className="size-4" />}
          label="Content Operations"
        />
        <QuickLink href="/team" icon={<Mail className="size-4" />} label="Team Access" />
      </section>
    </DashboardPage>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
