import Link from "next/link";
import { Inbox } from "lucide-react";
import { Badge, Button, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getSubmissions } from "@/lib/dashboard/content-ops";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getDashboardSessionContext } from "@/lib/session";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Submissions">
        <UnauthorizedState message="Sign in to view form submissions." />
      </DashboardPage>
    );
  }

  const rawParams = await searchParams;
  const params: ReturnType<typeof parseDashboardSearchParams> & {
    formId?: string;
    websiteId?: string;
  } = {
    ...parseDashboardSearchParams(rawParams),
  };
  if (typeof rawParams.formId === "string") {
    params.formId = rawParams.formId;
  }
  if (typeof rawParams.websiteId === "string") {
    params.websiteId = rawParams.websiteId;
  }
  const submissions = await getSubmissions({
    database,
    params,
    request: createDashboardRequest(context),
  });

  return (
    <DashboardPage
      description="Privacy-safe operational inbox for website form submissions."
      title="Submissions"
    >
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["new", "read", "archived", "spam"]}
      />
      {submissions.items.length === 0 ? (
        <EmptyState
          description="New website form submissions will appear here. Submission values are only shown on the protected detail screen."
          icon={<Inbox className="size-5" />}
          title="No submissions found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {submissions.items.map((submission) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_1fr_0.7fr_0.8fr_auto] md:items-center"
              key={submission.id}
            >
              <div>
                <p className="font-medium">{submission.formName}</p>
                <p className="text-sm text-muted-foreground">{submission.websiteName}</p>
              </div>
              <span className="text-sm">{submission.organizationName}</span>
              <Badge variant={submission.status === "new" ? "info" : "outline"}>
                {submission.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDashboardDateTime(submission.submittedAt)}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/submissions/${submission.id}`}>Open</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
