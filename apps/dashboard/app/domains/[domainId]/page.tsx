import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getDomainDetail, setPrimaryDomain } from "@/lib/deployment/services";
import { getDashboardSessionContext } from "@/lib/session";

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ domainId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return <DashboardPage title="Domain"><UnauthorizedState message="Sign in to view this domain." /></DashboardPage>;
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
    revalidatePath(`/websites/${websiteId}/hosting`);
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
          {!domain.isPrimary ? (
            <form action={makePrimary}>
              <Button size="sm" type="submit">Set Primary</Button>
            </form>
          ) : null}
        </>
      }
      description="DNS, SSL, verification state, and routing context for this hostname."
      title={domain.domain}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Website" value={domain.website.name} />
        <Info label="Verification" value={domain.verificationStatus} tone={domain.verificationStatus === "verified" ? "success" : "warning"} />
        <Info label="DNS" value={domain.dnsState} tone={domain.dnsState === "valid" ? "success" : "outline"} />
        <Info label="SSL" value={domain.sslState} tone={domain.sslState === "issued" ? "success" : "outline"} />
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Required DNS Records</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No provider DNS records have been supplied yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="grid grid-cols-[0.7fr_1fr_1.8fr_0.6fr] gap-3 border-b border-border px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                <span>Type</span><span>Name</span><span>Value</span><span>TTL</span>
              </div>
              {records.map((record, index) => (
                <div className="grid grid-cols-[0.7fr_1fr_1.8fr_0.6fr] gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0" key={`${record.type}-${record.name}-${index.toString()}`}>
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
        <Badge className="mt-2" variant={tone}>{value}</Badge>
      </CardContent>
    </Card>
  );
}
