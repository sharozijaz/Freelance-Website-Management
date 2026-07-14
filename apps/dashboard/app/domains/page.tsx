import Link from "next/link";
import { Link2 } from "lucide-react";
import { Badge, Button, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getDomains } from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";

export default async function DomainsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Domains">
        <UnauthorizedState message="Sign in to view domains." />
      </DashboardPage>
    );
  }

  const request = createDashboardRequest(context);
  const rawParams = await searchParams;
  const params = parseDashboardSearchParams(rawParams);
  const websiteId = typeof rawParams.websiteId === "string" ? rawParams.websiteId : undefined;
  const domains = await getDomains({
    database,
    params: websiteId ? { ...params, websiteId } : params,
    request,
  });

  return (
    <DashboardPage
      description="Domain ownership, DNS, SSL, and primary-domain status across websites."
      title="Domains"
    >
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["pending", "verified", "failed"]}
      />

      {domains.items.length === 0 ? (
        <EmptyState
          description="Open a website hosting page to add the first domain."
          icon={<Link2 className="size-5" />}
          title="No domains found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[1fr_0.9fr_0.8fr_0.7fr_0.7fr_0.6fr_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Domain</span>
            <span>Website</span>
            <span>Client</span>
            <span>DNS</span>
            <span>SSL</span>
            <span>Primary</span>
            <span>Open</span>
          </div>
          {domains.items.map((domain) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_0.9fr_0.8fr_0.7fr_0.7fr_0.6fr_auto] md:items-center"
              key={domain.id}
            >
              <div>
                <p className="font-medium">{domain.domain}</p>
                <Badge
                  className="mt-1"
                  variant={domain.verificationStatus === "verified" ? "success" : "warning"}
                >
                  {domain.verificationStatus}
                </Badge>
              </div>
              <Link
                className="text-sm underline-offset-4 hover:underline"
                href={`/websites/${domain.websiteId}/hosting`}
              >
                {domain.websiteName}
              </Link>
              <span className="text-sm">{domain.organizationName}</span>
              <Badge variant={domain.dnsState === "valid" ? "success" : "outline"}>
                {domain.dnsState}
              </Badge>
              <Badge variant={domain.sslState === "issued" ? "success" : "outline"}>
                {domain.sslState}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {domain.isPrimary ? "Yes" : "No"}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/domains/${domain.id}`}>Details</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
