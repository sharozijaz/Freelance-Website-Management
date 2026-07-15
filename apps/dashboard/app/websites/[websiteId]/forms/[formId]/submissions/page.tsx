import Link from "next/link";
import { Inbox } from "lucide-react";
import { Badge, Button, EmptyState } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getSubmissions } from "@/lib/dashboard/content-ops";
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Form Submissions",
};

export default async function WebsiteFormSubmissionsPage({
  params,
}: {
  params: Promise<{ formId: string; websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Form Submissions">
        <UnauthorizedState message="Sign in to view form submissions." />
      </DashboardPage>
    );
  }

  const { formId, websiteId } = await params;
  const submissions = await getSubmissions({
    database,
    params: {
      formId,
      page: 1,
      query: "",
      sort: "submitted_desc",
      status: "all",
      websiteId,
    },
    request: createDashboardRequest(context),
  });

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/websites/${websiteId}/forms`}>Back to Forms</Link>
        </Button>
      }
      description="Website-scoped submission inbox. Values open on the protected text-only detail view."
      title="Form Submissions"
    >
      {submissions.items.length === 0 ? (
        <EmptyState
          description="Connected website submissions for this form will appear here."
          icon={<Inbox className="size-5" />}
          title="No submissions found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {submissions.items.map((submission) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_0.7fr_0.8fr_auto] md:items-center"
              key={submission.id}
            >
              <div>
                <p className="font-medium">{submission.formName}</p>
                <p className="text-sm text-muted-foreground">{submission.websiteName}</p>
              </div>
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
