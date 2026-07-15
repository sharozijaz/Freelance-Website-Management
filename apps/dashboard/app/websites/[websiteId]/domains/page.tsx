import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import {
  addWebsiteDomain,
  domainDnsStates,
  domainSslStates,
  getWebsiteDomains,
  removeWebsiteDomain,
  setPrimaryDomain,
  updateDomainOperationalStatus,
} from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";
import { DomainDiagnosticsClient } from "./domain-diagnostics-client";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function revalidateDomainPaths(websiteId: string) {
  revalidatePath("/domains");
  revalidatePath(`/websites/${websiteId}`);
  revalidatePath(`/websites/${websiteId}/domains`);
  revalidatePath(`/websites/${websiteId}/hosting`);
  revalidatePath(`/websites/${websiteId}/launch`);
}

export const metadata = {
  title: "Website Domains",
};

export default async function WebsiteDomainsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Domains">
        <UnauthorizedState message="Sign in to manage domains." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const request = createDashboardRequest(context);
  const domainState = await getWebsiteDomains({ database, request, websiteId });

  async function addDomain(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await addWebsiteDomain({
      database,
      domain: formString(formData, "domain"),
      environmentId: formString(formData, "environmentId"),
      request: createDashboardRequest(actionContext),
      websiteId,
    });
    revalidateDomainPaths(websiteId);
    redirect(`/websites/${websiteId}/domains`);
  }

  async function makePrimary(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await setPrimaryDomain({
      database,
      domainId: formString(formData, "domainId"),
      request: createDashboardRequest(actionContext),
    });
    revalidateDomainPaths(websiteId);
    redirect(`/websites/${websiteId}/domains`);
  }

  async function updateStatus(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await updateDomainOperationalStatus({
      database,
      dnsState: formString(formData, "dnsState"),
      domainId: formString(formData, "domainId"),
      request: createDashboardRequest(actionContext),
      sslState: formString(formData, "sslState"),
      websiteId,
    });
    revalidateDomainPaths(websiteId);
    redirect(`/websites/${websiteId}/domains`);
  }

  async function removeDomain(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await removeWebsiteDomain({
      database,
      domainId: formString(formData, "domainId"),
      request: createDashboardRequest(actionContext),
      websiteId,
    });
    revalidateDomainPaths(websiteId);
    redirect(`/websites/${websiteId}/domains`);
  }

  const productionDomains = domainState.domains.filter(
    (domain) => domain.environment.type === "production",
  );
  const stagingDomains = domainState.domains.filter(
    (domain) => domain.environment.type === "staging",
  );

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/hosting`}>Hosting</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/launch`}>Launch</Link>
          </Button>
        </>
      }
      description="Track which hostnames belong to staging or production. This does not buy or register domains; it records and verifies domains you already control."
      title={`${domainState.website.name} Domains`}
    >
      <WebsiteNavigation active="domains" productionUrl={domainState.website.productionUrl} websiteId={websiteId} />

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Add Domain</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="mb-4 text-sm text-muted-foreground">
            Add the exact hostname you point at this website, such as 2026.sharoz.dev or
            www.client.com. Choose production only when the hostname should be treated as the public
            live address.
          </p>
          <form action={addDomain} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" name="domain" placeholder="www.client-example.com" required />
            </div>
            <div>
              <Label htmlFor="environmentId">Environment</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="environmentId"
                name="environmentId"
                required
              >
                {domainState.environments.map((environment) => (
                  <option key={environment.id} value={environment.id}>
                    {environment.name} ({environment.type})
                  </option>
                ))}
              </select>
            </div>
            <Button className="self-end" type="submit">
              Add Domain
            </Button>
          </form>
        </CardContent>
      </Card>

      <DomainGroup
        domains={productionDomains}
        emptyTitle="No production domains"
        makePrimary={makePrimary}
        removeDomain={removeDomain}
        title="Production"
        updateStatus={updateStatus}
      />
      <DomainGroup
        domains={stagingDomains}
        emptyTitle="No staging domains"
        makePrimary={makePrimary}
        removeDomain={removeDomain}
        title="Staging"
        updateStatus={updateStatus}
      />
    </DashboardPage>
  );
}

function DomainGroup({
  domains,
  emptyTitle,
  makePrimary,
  removeDomain,
  title,
  updateStatus,
}: {
  domains: Awaited<ReturnType<typeof getWebsiteDomains>>["domains"];
  emptyTitle: string;
  makePrimary: (formData: FormData) => Promise<void>;
  removeDomain: (formData: FormData) => Promise<void>;
  title: string;
  updateStatus: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {domains.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <div className="rounded-md border border-border p-3" key={domain.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{domain.domain}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {formatDashboardDateTime(domain.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={domain.isPrimary ? "success" : "outline"}>
                        {domain.isPrimary ? "Primary" : domain.environment.type}
                      </Badge>
                      <Badge variant={domain.dnsState === "valid" ? "success" : "outline"}>
                        DNS {domain.dnsState}
                      </Badge>
                      <Badge variant={domain.sslState === "issued" ? "success" : "outline"}>
                        SSL {domain.sslState}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/domains/${domain.id}`}>Details</Link>
                    </Button>
                    {domain.environment.type === "production" && !domain.isPrimary ? (
                      <form action={makePrimary}>
                        <input name="domainId" type="hidden" value={domain.id} />
                        <Button size="sm" type="submit">
                          Set Primary
                        </Button>
                      </form>
                    ) : null}
                    <form action={removeDomain}>
                      <input name="domainId" type="hidden" value={domain.id} />
                      <Button disabled={domain.isPrimary} size="sm" type="submit" variant="outline">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
                <form action={updateStatus} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input name="domainId" type="hidden" value={domain.id} />
                  <div>
                    <Label htmlFor={`dnsState-${domain.id}`}>DNS status</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      defaultValue={domain.dnsState}
                      id={`dnsState-${domain.id}`}
                      name="dnsState"
                    >
                      {domainDnsStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`sslState-${domain.id}`}>SSL status</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      defaultValue={domain.sslState}
                      id={`sslState-${domain.id}`}
                      name="sslState"
                    >
                      {domainSslStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button className="self-end" size="sm" type="submit" variant="outline">
                    Save Status
                  </Button>
                </form>
                <DomainDiagnosticsClient domainId={domain.id} websiteId={domain.websiteId} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
