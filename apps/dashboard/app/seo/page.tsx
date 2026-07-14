import Link from "next/link";
import { SearchCheck } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getSeoOperations } from "@/lib/dashboard/seo";
import { getDashboardSessionContext } from "@/lib/session";

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="SEO">
        <UnauthorizedState message="Sign in to review SEO operations." />
      </DashboardPage>
    );
  }

  const rawParams = await searchParams;
  const params: ReturnType<typeof parseDashboardSearchParams> & {
    resourceType: string;
    ruleId: string;
    severity: string;
    websiteId?: string;
  } = {
    ...parseDashboardSearchParams(rawParams),
    resourceType: typeof rawParams.resourceType === "string" ? rawParams.resourceType : "all",
    ruleId: typeof rawParams.ruleId === "string" ? rawParams.ruleId : "all",
    severity: typeof rawParams.severity === "string" ? rawParams.severity : "all",
  };
  if (typeof rawParams.websiteId === "string") {
    params.websiteId = rawParams.websiteId;
  }
  const seo = await getSeoOperations({
    database,
    params,
    request: createDashboardRequest(context),
  });
  const errors = seo.findings.filter((finding) => finding.severity === "error").length;
  const warnings = seo.findings.filter((finding) => finding.severity === "warning").length;
  const recommendations = seo.findings.filter(
    (finding) => finding.severity === "recommendation",
  ).length;

  return (
    <DashboardPage
      description="Website-aware SEO findings from platform-controlled content and media data."
      title="SEO Overview"
    >
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Websites Reviewed" value={seo.summaries.length.toString()} />
        <Metric label="Errors" value={errors.toString()} />
        <Metric label="Warnings" value={warnings.toString()} />
        <Metric label="Recommendations" value={recommendations.toString()} />
      </section>

      <SeoFilters
        resourceType={params.resourceType}
        ruleId={params.ruleId}
        severity={params.severity}
      />

      {seo.summaries.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {seo.summaries.map((summary) => (
            <Card key={summary.websiteId}>
              <CardHeader className="p-4">
                <CardTitle className="text-base">{summary.websiteName}</CardTitle>
                <p className="text-sm text-muted-foreground">{summary.organizationName}</p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={summary.errors ? "error" : "outline"}>
                    {summary.errors} errors
                  </Badge>
                  <Badge variant={summary.warnings ? "warning" : "outline"}>
                    {summary.warnings} warnings
                  </Badge>
                  <Badge variant="outline">{summary.recommendations} recommendations</Badge>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/websites/${summary.websiteId}/seo`}>Open Website SEO</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {seo.findings.length === 0 ? (
        <EmptyState
          description="SEO findings will appear when accessible website content or media needs attention."
          icon={<SearchCheck className="size-5" />}
          title="No SEO findings"
        />
      ) : (
        <FindingsList findings={seo.findings.slice(0, 50)} />
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

function SeoFilters({
  resourceType,
  ruleId,
  severity,
}: {
  resourceType: string;
  ruleId: string;
  severity: string;
}) {
  return (
    <form
      className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-4"
      method="get"
    >
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        defaultValue={severity}
        name="severity"
      >
        <option value="all">All severities</option>
        <option value="error">Errors</option>
        <option value="warning">Warnings</option>
        <option value="recommendation">Recommendations</option>
      </select>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        defaultValue={resourceType}
        name="resourceType"
      >
        <option value="all">All resources</option>
        <option value="page">Pages</option>
        <option value="post">Posts</option>
        <option value="media">Media</option>
      </select>
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        defaultValue={ruleId === "all" ? "" : ruleId}
        name="ruleId"
        placeholder="Rule ID"
      />
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}

function FindingsList({
  findings,
}: {
  findings: Awaited<ReturnType<typeof getSeoOperations>>["findings"];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {findings.map((finding) => (
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
            <p className="mt-1 text-xs text-muted-foreground">{finding.recommendedAction}</p>
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
  );
}
