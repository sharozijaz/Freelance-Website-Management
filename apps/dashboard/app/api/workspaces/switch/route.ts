import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createActiveOrganizationCookieHeader } from "@agency/auth/session";
import { switchActiveOrganization } from "@agency/auth/organizations";
import { database } from "@/lib/auth";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

export async function POST(request: Request) {
  let organizationId = "";
  let returnTo = "/";

  try {
    const context = await requireDashboardSessionContext();
    const formData = await request.formData();
    const submittedOrganizationId = formData.get("organizationId");
    const submittedReturnTo = formData.get("returnTo");

    if (typeof submittedReturnTo === "string" && submittedReturnTo.startsWith("/")) {
      returnTo = submittedReturnTo;
    }

    if (typeof submittedOrganizationId !== "string") {
      throw new Error("Missing organization id.");
    }

    if (submittedOrganizationId === "") {
      const cookieStore = await cookies();
      cookieStore.delete("agency_active_organization_id");
    } else {
      organizationId = submittedOrganizationId;
      await switchActiveOrganization({ context, database, organizationId });

      const cookieStore = await cookies();
      const cookieHeader = createActiveOrganizationCookieHeader({ organizationId });
      const [nameValue, ...attributes] = cookieHeader.split("; ");
      if (!nameValue) {
        throw new Error("Active organization cookie could not be created.");
      }

      const [name, value] = nameValue.split("=");

      if (!name || !value) {
        throw new Error("Active organization cookie could not be created.");
      }

      cookieStore.set(name, decodeURIComponent(value), {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
        secure: attributes.includes("Secure"),
      });
    }
  } catch (error) {
    const message = toSafeErrorMessage(error, "Workspace could not be switched.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo || `/clients/${organizationId}`);
}
