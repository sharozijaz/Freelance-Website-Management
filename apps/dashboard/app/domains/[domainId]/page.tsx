import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  domainDnsStates,
  domainSslStates,
  getDomainDetail,
  removeWebsiteDomain,
  setPrimaryDomain,
  updateDomainOperationalStatus,
} from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";
import { DomainDiagnosticsClient } from "../../websites/[websiteId]/domains/domain-diagnostics-client";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ domainId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Domain">
        <UnauthorizedState message="Sign in to view this domain." />
      </DashboardPage>
    );
  }

  const request = createDashboardRequest(context);
  const { domainId } = await params;
  const domain = await getDomainDetail({ database, domainId, request });
  const websiteId = domain.websiteId;

  async function makePrimary() {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await setPrimaryDomain({
      database,
      domainId,
      request: createDashboardRequest(actionContext),
    });
    revalidatePath("/domains");
    revalidatePath(`/domains/${domainId}`);
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/domains`);
    revalidatePath(`/websites/${websiteId}/hosting`);
    revalidatePath(`/websites/${websiteId}/launch`);
  }

  async function updateStatus(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await updateDomainOperationalStatus({
      database,
      dnsState: formString(formData, "dnsState"),
      domainId,
      request: createDashboardRequest(actionContext),
      sslState: formString(formData, "sslState"),
      websiteId,
    });
    revalidatePath("/domains");
    revalidatePath(`/domains/${domainId}`);
    revalidatePath(`/websites/${websiteId}/domains`);
    revalidatePath(`/websites/${websiteId}/launch`);
  }

  async function removeDomain() {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;
    await removeWebsiteDomain({
      database,
      domainId,
      request: createDashboardRequest(actionContext),
      websiteId,
    });
    revalidatePath("/domains");
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/domains`);
    revalidatePath(`/websites/${websiteId}/hosting`);
    revalidatePath(`/websites/${websiteId}/launch`);
  }

  const records = domain.requiredDnsRecords as {
    name: string;
    priority?: number | null;
    purpose?: string | null;
    ttl?: number | null;
    type: string;
    value: string;
  }[];

  return (
    <DashboardPage
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/hosting`}>Website Hosting</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/websites/${websiteId}/domains`}>Website Domains</Link>
          </Button>
          {!domain.isPrimary ? (
            <form action={makePrimary}>
              <Button size="sm" type="submit">
                Set Primary
              </Button>
            </form>
          ) : null}
          <form action={removeDomain}>
            <Button disabled={domain.isPrimary} size="sm" type="submit" variant="outline">
              Remove
            </Button>
          </form>
        </>
      }
      description="DNS, SSL, verification state, and routing context for this hostname."
      title={domain.domain}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Website" value={domain.website.name} />
        <Info label="Environment" value={domain.environment.name} />
        <Info
          label="Verification"
          value={domain.verificationStatus}
          tone={domain.verificationStatus === "verified" ? "success" : "warning"}
        />
        <Info
          label="DNS"
          value={domain.dnsState}
          tone={domain.dnsState === "valid" ? "success" : "outline"}
        />
        <Info
          label="SSL"
          value={domain.sslState}
          tone={domain.sslState === "issued" ? "success" : "outline"}
        />
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Operational Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form action={updateStatus} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor="dnsState">DNS status</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={domain.dnsState}
                id="dnsState"
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
              <Label htmlFor="sslState">SSL status</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={domain.sslState}
                id="sslState"
                name="sslState"
              >
                {domainSslStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <Button className="self-end" type="submit" variant="outline">
              Save Status
            </Button>
          </form>
          <p className="mt-3 text-sm text-muted-foreground">
            These statuses are manual operational records. Mark DNS or SSL ready only after real
            verification.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Required DNS Records</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No provider DNS records have been supplied yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="grid grid-cols-[0.7fr_1fr_1.8fr_0.6fr] gap-3 border-b border-border px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                <span>Type</span>
                <span>Name</span>
                <span>Value</span>
                <span>TTL</span>
              </div>
              {records.map((record, index) => (
                <div
                  className="grid grid-cols-[0.7fr_1fr_1.8fr_0.6fr] gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0"
                  key={`${record.type}-${record.name}-${index.toString()}`}
                >
                  <span>{record.type}</span>
                  <span className="break-words">{record.name}</span>
                  <span className="break-words">{record.value}</span>
                  <span>{record.ttl ?? "Auto"}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Observed Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <DomainDiagnosticsClient domainId={domain.id} websiteId={domain.websiteId} />
        </CardContent>
      </Card>
    </DashboardPage>
  );
}

function Info({
  label,
  tone = "outline",
  value,
}: {
  label: string;
  tone?: "outline" | "success" | "warning";
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <Badge className="mt-2" variant={tone}>
          {value}
        </Badge>
      </CardContent>
    </Card>
  );
}
