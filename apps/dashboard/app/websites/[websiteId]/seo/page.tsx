import Link from "next/link";
import { SearchCheck } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getWebsiteSeoOperations } from "@/lib/dashboard/seo";
import { getDashboardSessionContext } from "@/lib/session";

export default async function WebsiteSeoPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Website SEO">
        <UnauthorizedState message="Sign in to review website SEO." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const seo = await getWebsiteSeoOperations({
    database,
    request: createDashboardRequest(context),
    websiteId,
  });
  const summary = seo.summaries[0];

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}`}>Website Settings</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/websites/${websiteId}`}>Back to Website</Link>
          </Button>
        </>
      }
      description="Operational SEO findings and settings workflow for this website."
      title={summary?.websiteName ? `${summary.websiteName} SEO` : "Website SEO"}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Findings" value={(summary?.findings ?? 0).toString()} />
        <Metric label="Errors" value={(summary?.errors ?? 0).toString()} />
        <Metric label="Warnings" value={(summary?.warnings ?? 0).toString()} />
        <Metric label="Recommendations" value={(summary?.recommendations ?? 0).toString()} />
      </section>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium">SEO Settings Workflow</p>
          <p className="mt-1 text-sm text-muted-foreground">
            SEO findings are generated from V2 platform content, media, and website delivery data.
            Public websites own presentation while the dashboard owns operational metadata.
          </p>
        </CardContent>
      </Card>

      {seo.findings.length === 0 ? (
        <EmptyState
          description="This website has no SEO findings from currently available platform data."
          icon={<SearchCheck className="size-5" />}
          title="No SEO findings"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {seo.findings.map((finding) => (
            <article
              className="grid gap-3 border-b border-border p-4 last:border-b-0 md:grid-cols-[0.7fr_1.5fr_0.8fr_auto] md:items-center"
              key={`${finding.ruleId}-${finding.resourceId}`}
            >
              <Badge
                variant={
                  finding.severity === "error"
                    ? "error"
                    : finding.severity === "warning"
                      ? "warning"
                      : "outline"
                }
              >
                {finding.severity}
              </Badge>
              <div>
                <p className="font-medium">{finding.title}</p>
                <p className="text-sm text-muted-foreground">{finding.description}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {finding.resourceType} · {finding.ruleId}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={finding.actionHref}>Review</Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
