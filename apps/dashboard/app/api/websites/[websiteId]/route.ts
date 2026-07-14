import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { updateWebsiteType } from "@/lib/dashboard/projects";
import { revalidateWebsiteWorkspace } from "@/lib/dashboard/revalidation";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;
  let returnTo = `/websites/${websiteId}`;

  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const formData = await request.formData();
    const submittedReturnTo = stringValue(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;
    const websiteType = stringValue(formData, "websiteType");

    if (!websiteType) {
      throw new Error("Website type is required.");
    }

    await updateWebsiteType({
      database,
      request: dashboardRequest,
      websiteId,
      websiteType,
    });

    revalidateWebsiteWorkspace(websiteId);
  } catch (error) {
    const message = toSafeErrorMessage(error, "Website could not be updated.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
