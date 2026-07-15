import { redirect } from "next/navigation";
import { archiveOrganization, permanentlyDeleteOrganization } from "@agency/auth/organizations";
import { database } from "@/lib/auth";
import { revalidateDashboardOverview } from "@/lib/dashboard/revalidation";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function value(formData: FormData, key: string): string | undefined {
  const item = formData.get(key);

  return typeof item === "string" && item.trim().length > 0 ? item.trim() : undefined;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  let returnTo = "/clients";

  try {
    const context = await requireDashboardSessionContext();
    const formData = await request.formData();
    const submittedReturnTo = value(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;
    const action = value(formData, "action");

    if (action !== "archive" && action !== "delete") {
      throw new Error("Unsupported workspace action.");
    }

    const { organizationId } = await params;

    if (context.activeOrganizationId === organizationId) {
      throw new Error("Switch to another workspace before changing the active one.");
    }

    if (action === "archive") {
      await archiveOrganization({
        context,
        database,
        organizationId,
      });
    } else {
      await permanentlyDeleteOrganization({
        confirmation: value(formData, "confirmation") ?? "",
        context,
        database,
        organizationId,
      });
    }

    revalidateDashboardOverview();
  } catch (error) {
    const message = toSafeErrorMessage(error, "Workspace could not be updated.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
