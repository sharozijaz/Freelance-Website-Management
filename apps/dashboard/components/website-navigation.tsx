import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@agency/ui";
import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";

type WebsiteNavigationItem =
  | "overview"
  | "hosting"
  | "domains"
  | "launch"
  | "environments"
  | "modules"
  | "blog"
  | "developer"
  | "seo"
  | "media"
  | "forms"
  | "deployments";

const websiteNavigationItems: {
  href: (websiteId: string) => string;
  key: WebsiteNavigationItem;
  label: string;
}[] = [
  { href: (websiteId) => `/websites/${websiteId}`, key: "overview", label: "Overview" },
  { href: (websiteId) => `/websites/${websiteId}/hosting`, key: "hosting", label: "Hosting" },
  { href: (websiteId) => `/websites/${websiteId}/domains`, key: "domains", label: "Domains" },
  { href: (websiteId) => `/websites/${websiteId}/launch`, key: "launch", label: "Launch" },
  {
    href: (websiteId) => `/websites/${websiteId}/environments`,
    key: "environments",
    label: "Environments",
  },
  { href: (websiteId) => `/websites/${websiteId}/modules`, key: "modules", label: "Modules" },
  { href: (websiteId) => `/websites/${websiteId}/blog`, key: "blog", label: "Blog" },
  { href: (websiteId) => `/websites/${websiteId}/media`, key: "media", label: "Media" },
  { href: (websiteId) => `/websites/${websiteId}/forms`, key: "forms", label: "Forms" },
  {
    href: (websiteId) => `/websites/${websiteId}/deployments`,
    key: "deployments",
    label: "Deployments",
  },
  { href: (websiteId) => `/websites/${websiteId}/developer`, key: "developer", label: "Developer" },
  { href: (websiteId) => `/websites/${websiteId}/seo`, key: "seo", label: "SEO" },
];

const websiteNavigationLabels = new Map(
  websiteNavigationItems.map((item) => [item.key, item.label] as const),
);

export function WebsiteNavigation({
  active,
  productionUrl,
  websiteName = "Website",
  websiteId,
}: {
  active: WebsiteNavigationItem;
  productionUrl?: string | null;
  websiteName?: string | null;
  websiteId: string;
}) {
  return (
    <nav
      aria-label="Website sections"
      className="space-y-3 rounded-lg border border-border bg-card p-3 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DashboardBreadcrumbs
          items={[
            { href: "/websites", label: "Websites" },
            { href: `/websites/${websiteId}`, label: websiteName ?? "Website" },
            { label: websiteNavigationLabels.get(active) ?? "Overview" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/websites">All Websites</Link>
          </Button>
          {productionUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={productionUrl} rel="noreferrer" target="_blank">
                Open Public Site
                <ExternalLink aria-hidden className="size-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {websiteNavigationItems.map((item) => (
          <Button
            asChild
            key={item.key}
            size="sm"
            variant={active === item.key ? "primary" : "outline"}
          >
            <Link
              aria-current={active === item.key ? "page" : undefined}
              href={item.href(websiteId)}
            >
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}
