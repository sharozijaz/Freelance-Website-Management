import { Button, Card, CardContent, CardHeader, CardTitle } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { requireSubmissionAccess } from "@/lib/dashboard/content-ops";
import { getDashboardSessionContext } from "@/lib/session";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Submission">
        <UnauthorizedState message="Sign in to view this submission." />
      </DashboardPage>
    );
  }

  const { submissionId } = await params;
  const submission = await requireSubmissionAccess({
    database,
    request: createDashboardRequest(context),
    submissionId,
  });
  const data = submission.data as Record<string, unknown>;

  return (
    <DashboardPage description="Protected submission detail. Values are rendered as text only." title={submission.form.name}>
      <section className="grid gap-4 xl:grid-cols-3">
        <Info label="Website" value={submission.website.name} />
        <Info label="Status" value={submission.status} />
        <Info label="Submitted" value={submission.submittedAt.toLocaleString()} />
      </section>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Submitted Fields</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-4 pt-0">
          {Object.entries(data).map(([key, value]) => (
            <div className="grid gap-2 py-3 md:grid-cols-[14rem_1fr]" key={key}>
              <span className="text-sm font-medium">{key}</span>
              <span className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {Array.isArray(value) ? value.join(", ") : String(value)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(["read", "archived", "spam"] as const).map((status) => (
          <form action={`/api/submissions/${submission.id}`} key={status} method="post">
            <input name="status" type="hidden" value={status} />
            <Button size="sm" type="submit" variant="outline">
              Mark {status}
            </Button>
          </form>
        ))}
      </div>
    </DashboardPage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 text-sm font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}
