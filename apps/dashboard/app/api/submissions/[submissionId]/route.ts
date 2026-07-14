import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { updateSubmissionStatus, type SubmissionStatus } from "@/lib/dashboard/content-ops";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

const allowedStatuses = new Set<SubmissionStatus>(["archived", "read", "spam"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params;
  let returnTo = `/submissions/${submissionId}`;

  try {
    const context = await requireDashboardSessionContext();
    const formData = await request.formData();
    const status = formData.get("status");

    if (typeof status !== "string" || !allowedStatuses.has(status as SubmissionStatus)) {
      throw new Error("Unsupported submission status.");
    }

    await updateSubmissionStatus({
      database,
      request: createDashboardRequest(context),
      status: status as SubmissionStatus,
      submissionId,
    });
  } catch (error) {
    const message = toSafeErrorMessage(error, "Submission could not be updated.");
    returnTo = `${returnTo}?error=${encodeURIComponent(message)}`;
  }

  redirect(returnTo);
}
