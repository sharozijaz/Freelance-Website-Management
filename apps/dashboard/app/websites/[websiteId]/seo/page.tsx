import Link from "next/link";
import { SearchCheck } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Input, Label, Textarea } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getWebsiteSeoOperations } from "@/lib/dashboard/seo";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Website SEO",
};

export default async function WebsiteSeoPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const rawSearchParams = await searchParams;
  const seo = await getWebsiteSeoOperations({
    database,
    request: createDashboardRequest(context),
    websiteId,
  });
  const summary = seo.summaries[0];
  const severity = typeof rawSearchParams.severity === "string" ? rawSearchParams.severity : "all";
  const resourceType =
    typeof rawSearchParams.resourceType === "string" ? rawSearchParams.resourceType : "all";
  const ruleId = typeof rawSearchParams.ruleId === "string" ? rawSearchParams.ruleId : "";
  const error = typeof rawSearchParams.error === "string" ? rawSearchParams.error : null;
  const filteredFindings = seo.findings
    .filter((finding) => (severity === "all" ? true : finding.severity === severity))
    .filter((finding) => (resourceType === "all" ? true : finding.resourceType === resourceType))
    .filter((finding) => (ruleId.trim() ? finding.ruleId.includes(ruleId.trim()) : true));

  return (
    <DashboardPage
      description="Operational SEO settings and findings for this connected website."
      title={summary?.websiteName ? `${summary.websiteName} SEO` : "Website SEO"}
    >
      <WebsiteNavigation
        active="seo"
        productionUrl={seo.website?.productionUrl ?? null}
        websiteId={websiteId}
        websiteName={seo.website?.name ?? summary?.websiteName ?? null}
      />

      {error ? (
        <Card>
          <CardContent className="p-4 text-sm text-error">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Findings" value={(summary?.findings ?? 0).toString()} />
        <Metric label="Errors" value={(summary?.errors ?? 0).toString()} />
        <Metric label="Warnings" value={(summary?.warnings ?? 0).toString()} />
        <Metric label="Recommendations" value={(summary?.recommendations ?? 0).toString()} />
      </section>

      <SeoSettingsForm settings={seo.settings} websiteId={websiteId} />

      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium">SEO Module Scope</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The dashboard stores website SEO defaults, audit findings, and review links. Connected
            public websites still need to consume these settings through the Platform API or mirror
            them in their own renderer.
          </p>
        </CardContent>
      </Card>

      <SeoFilters resourceType={resourceType} ruleId={ruleId} severity={severity} />

      {filteredFindings.length === 0 ? (
        <EmptyState
          description="This website has no SEO findings for the selected filters."
          icon={<SearchCheck className="size-5" />}
          title="No SEO findings"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {filteredFindings.map((finding) => (
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
                <Link href={finding.actionHref ?? `/websites/${websiteId}/seo`}>Review</Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}

function SeoSettingsForm({
  settings,
  websiteId,
}: {
  settings: Awaited<ReturnType<typeof getWebsiteSeoOperations>>["settings"];
  websiteId: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="text-base font-semibold">Website SEO Settings</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Defaults apply when individual pages or posts do not provide their own metadata.
          </p>
        </div>
        <form
          action={`/api/websites/${websiteId}/seo`}
          className="grid gap-4 xl:grid-cols-2"
          method="post"
        >
          <div>
            <Label htmlFor="siteTitle">Site title</Label>
            <Input defaultValue={settings.siteTitle ?? ""} id="siteTitle" name="siteTitle" />
          </div>
          <div>
            <Label htmlFor="titleTemplate">Title template</Label>
            <Input
              defaultValue={settings.titleTemplate ?? ""}
              id="titleTemplate"
              name="titleTemplate"
              placeholder="%s | Website Name"
            />
          </div>
          <div>
            <Label htmlFor="canonicalBaseUrl">Canonical base URL</Label>
            <Input
              defaultValue={settings.canonicalBaseUrl ?? ""}
              id="canonicalBaseUrl"
              name="canonicalBaseUrl"
              placeholder="https://example.com"
              type="url"
            />
          </div>
          <div>
            <Label htmlFor="socialImage">Default social image URL</Label>
            <Input
              defaultValue={settings.socialImage ?? ""}
              id="socialImage"
              name="socialImage"
              placeholder="https://example.com/og.jpg"
              type="url"
            />
          </div>
          <div>
            <Label htmlFor="defaultOgImage">Open Graph image URL</Label>
            <Input
              defaultValue={settings.defaultOgImage ?? ""}
              id="defaultOgImage"
              name="defaultOgImage"
              placeholder="https://example.com/og.jpg"
              type="url"
            />
          </div>
          <div>
            <Label htmlFor="twitterCard">Twitter card</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={settings.twitterCard}
              id="twitterCard"
              name="twitterCard"
            >
              <option value="summary_large_image">Summary large image</option>
              <option value="summary">Summary</option>
            </select>
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="defaultMetaDescription">Default meta description</Label>
            <Textarea
              defaultValue={settings.defaultMetaDescription ?? ""}
              id="defaultMetaDescription"
              name="defaultMetaDescription"
              rows={3}
            />
          </div>
          <div className="flex flex-wrap gap-4 xl:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked={settings.robotsIndex} name="robotsIndex" type="checkbox" />
              Robots index by default
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked={settings.robotsFollow} name="robotsFollow" type="checkbox" />
              Robots follow by default
            </label>
          </div>
          <Button className="xl:col-span-2" type="submit">
            Save SEO Settings
          </Button>
        </form>
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
        <option value="website">Website settings</option>
        <option value="page">Pages</option>
        <option value="post">Posts</option>
        <option value="media">Media</option>
      </select>
      <Input defaultValue={ruleId} name="ruleId" placeholder="Rule ID" />
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
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
