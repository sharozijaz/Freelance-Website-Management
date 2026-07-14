import { redirect } from "next/navigation";
import { archiveOrganization } from "@agency/auth/organizations";
import { database } from "@/lib/auth";
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

    if (action !== "archive") {
      throw new Error("Unsupported workspace action.");
    }

    const { organizationId } = await params;

    if (context.activeOrganizationId === organizationId) {
      throw new Error("Switch to another workspace before archiving the active one.");
    }

    await archiveOrganization({
      context,
      database,
      organizationId,
    });
  } catch (error) {
    const message = toSafeErrorMessage(error, "Workspace could not be updated.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
