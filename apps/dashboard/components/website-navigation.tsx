import Link from "next/link";
import { Button } from "@agency/ui";

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

export function WebsiteNavigation({
  active,
  productionUrl,
  websiteId,
}: {
  active: WebsiteNavigationItem;
  productionUrl?: string | null;
  websiteId: string;
}) {
  return (
    <nav
      aria-label="Website sections"
      className="rounded-lg border border-border bg-card p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/websites">All Websites</Link>
        </Button>
        {productionUrl ? (
          <Button asChild size="sm" variant="outline">
            <a href={productionUrl}>Open Public Site</a>
          </Button>
        ) : null}
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
