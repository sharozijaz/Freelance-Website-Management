import { redirect } from "next/navigation";
import { createInvitation, membershipRoles } from "@agency/auth/organizations";
import type { MembershipRole } from "@agency/auth";
import { database } from "@/lib/auth";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function parseRole(value: FormDataEntryValue | null): MembershipRole {
  if (typeof value === "string" && membershipRoles.includes(value as MembershipRole)) {
    return value as MembershipRole;
  }

  throw new Error("Invalid role.");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const { organizationId } = await params;
  let invitedUrl: string | null = null;
  let returnTo = `/workspaces/${organizationId}/members`;

  try {
    const context = await requireDashboardSessionContext();
    const formData = await request.formData();
    const email = formData.get("email");
    const submittedReturnTo = formData.get("returnTo");

    if (typeof submittedReturnTo === "string" && submittedReturnTo.startsWith("/")) {
      returnTo = submittedReturnTo;
    }

    if (typeof email !== "string") {
      throw new Error("Email is required.");
    }

    const result = await createInvitation({
      acceptBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      context,
      database,
      input: {
        email,
        organizationId,
        role: parseRole(formData.get("role")),
      },
    });

    invitedUrl = result.url;
  } catch (error) {
    const message = toSafeErrorMessage(error, "Invitation could not be created.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  if (!invitedUrl) {
    redirect(`${returnTo}?error=${encodeURIComponent("Invitation URL missing.")}`);
  }

  redirect(`${returnTo}?invited=${encodeURIComponent(invitedUrl)}`);
}
