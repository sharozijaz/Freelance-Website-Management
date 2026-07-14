import { redirect } from "next/navigation";
import {
  membershipRoles,
  setMembershipStatus,
  updateMembershipRole,
} from "@agency/auth/organizations";
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
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const { membershipId } = await params;
  const formData = await request.formData();
  const organizationValue = formData.get("organizationId");
  const organizationId = typeof organizationValue === "string" ? organizationValue : "";

  try {
    const context = await requireDashboardSessionContext();
    const action = formData.get("action");

    if (action === "role") {
      await updateMembershipRole({
        context,
        database,
        membershipId,
        role: parseRole(formData.get("role")),
      });
    } else if (action === "suspend") {
      await setMembershipStatus({ context, database, membershipId, status: "disabled" });
    } else if (action === "reactivate") {
      await setMembershipStatus({ context, database, membershipId, status: "active" });
    } else if (action === "remove") {
      await setMembershipStatus({ context, database, membershipId, status: "removed" });
    } else {
      throw new Error("Invalid membership action.");
    }
  } catch (error) {
    const message = toSafeErrorMessage(error, "Membership could not be updated.");
    redirect(`/workspaces/${organizationId}/members?error=${encodeURIComponent(message)}`);
  }

  redirect(`/workspaces/${organizationId}/members`);
}
