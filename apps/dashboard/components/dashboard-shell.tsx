"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  FileText,
  Globe2,
  Images,
  SearchCheck,
  LayoutDashboard,
  Link2,
  ListChecks,
  Rocket,
  Send,
  Settings,
  Users,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@agency/ui";
import type { SessionContext } from "@agency/auth";
import { cn } from "@agency/lib/utils";
import { SignOutButton } from "./sign-out-button";

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

const navigation = [
  { description: "Agency operations", href: "/", icon: LayoutDashboard, label: "Overview" },
  { description: "Client workspaces", href: "/clients", icon: Building2, label: "Clients" },
  { description: "Delivery workflow", href: "/projects", icon: ListChecks, label: "Projects" },
  { description: "Managed sites", href: "/websites", icon: Globe2, label: "Websites" },
  { description: "Deployment history", href: "/deployments", icon: Rocket, label: "Deployments" },
  { description: "Domain inventory", href: "/domains", icon: Link2, label: "Domains" },
  { description: "CMS gateway", href: "/content", icon: FileText, label: "Content" },
  { description: "Assets", href: "/media", icon: Images, label: "Media" },
  { description: "Website forms", href: "/forms", icon: Send, label: "Forms" },
  { description: "SEO operations", href: "/seo", icon: SearchCheck, label: "SEO" },
  { description: "Access control", href: "/team", icon: Users, label: "Team" },
  { description: "Workspace details", href: "/settings", icon: Settings, label: "Settings" },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageContext(pathname: string) {
  const item = navigation.find((entry) => isActiveRoute(pathname, entry.href));

  if (pathname.startsWith("/clients/")) {
    return {
      breadcrumb: "Clients",
      description: "Client workspace operations",
      title: "Client Workspace",
    };
  }

  return {
    breadcrumb: item?.label ?? "Dashboard",
    description: item?.description ?? "Agency operations",
    title: item?.label ?? "Dashboard",
  };
}

function getInitials(nameOrEmail: string) {
  return nameOrEmail
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DashboardShell({
  activeOrganization,
  children,
  context,
  organizations,
}: {
  activeOrganization: OrganizationSummary | null;
  children: ReactNode;
  context: SessionContext | null;
  organizations: OrganizationSummary[];
}) {
  const pathname = usePathname();

  if (!context) {
    return <>{children}</>;
  }

  const page = getPageContext(pathname);
  const returnTo = pathname || "/";
  const activeMembership = activeOrganization
    ? context.memberships.find(
        (membership) =>
          membership.organizationId === activeOrganization.id && membership.status === "active",
      )
    : null;
  const userLabel = context.user.name ?? context.user.email;
  const roleLabel = activeMembership?.role ?? "agency";

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-border bg-surface lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-border p-4">
            <Link className="font-display text-base font-semibold" href="/">
              Agency Platform
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">Operations dashboard</p>
          </div>
          <nav aria-label="Dashboard" className="flex-1 space-y-1 p-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(pathname, item.href);
              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-4">
            <p className="text-xs font-medium text-muted-foreground">Workspace</p>
            <p className="mt-1 truncate text-sm font-medium">
              {activeOrganization?.name ?? "Agency Overview"}
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-3 md:px-6">
            <nav aria-label="Mobile dashboard" className="flex gap-2 overflow-x-auto lg:hidden">
              {navigation.map((item) => {
                const isActive = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "border-foreground bg-muted text-foreground"
                        : "border-border text-muted-foreground",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {page.breadcrumb}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-lg font-semibold">{page.title}</h1>
                  <Badge variant={activeOrganization ? "info" : "outline"}>
                    {activeOrganization ? "Client workspace" : "Agency workspace"}
                  </Badge>
                  <Badge variant="outline">{roleLabel.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
              </div>
              <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center">
                <form action="/api/workspaces/switch" className="flex gap-2" method="post">
                  <label className="sr-only" htmlFor="organizationId">
                    Switch workspace
                  </label>
                  <select
                    className="h-9 max-w-56 rounded-md border border-border bg-background px-3 text-sm"
                    defaultValue={activeOrganization?.id ?? ""}
                    id="organizationId"
                    name="organizationId"
                  >
                    <option value="">Agency Overview</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <Button size="sm" type="submit" variant="outline">
                    Switch
                  </Button>
                </form>
                <Dropdown>
                  <DropdownTrigger asChild>
                    <Button className="justify-start" size="sm" variant="ghost">
                      <Avatar className="size-7">
                        <AvatarFallback>{getInitials(userLabel) || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-36 truncate">{userLabel}</span>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownContent align="end" className="w-64">
                    <DropdownLabel>
                      <span className="block truncate">{userLabel}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {activeOrganization?.name ?? "Agency Overview"}
                      </span>
                    </DropdownLabel>
                    <DropdownSeparator />
                    <DropdownItem disabled>{roleLabel.replaceAll("_", " ")}</DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem
                      onSelect={(event) => {
                        event.preventDefault();
                      }}
                    >
                      <SignOutButton />
                    </DropdownItem>
                  </DropdownContent>
                </Dropdown>
              </div>
            </div>
            <div>
              <p className="sr-only">
                Active workspace: {activeOrganization?.name ?? "Agency Overview"}
              </p>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
