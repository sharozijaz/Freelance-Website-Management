import { redirect } from "next/navigation";
import { revokeInvitation } from "@agency/auth/organizations";
import { database } from "@/lib/auth";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const { invitationId } = await params;
  const formData = await request.formData();
  const submittedReturnTo = formData.get("returnTo");
  const returnTo =
    typeof submittedReturnTo === "string" && submittedReturnTo.startsWith("/")
      ? submittedReturnTo
      : "/team";

  try {
    const context = await requireDashboardSessionContext();
    await revokeInvitation({ context, database, invitationId });
  } catch (error) {
    const message = toSafeErrorMessage(error, "Invitation could not be revoked.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
