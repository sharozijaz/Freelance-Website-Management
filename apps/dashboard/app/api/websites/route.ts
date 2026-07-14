import { redirect } from "next/navigation";
import { createWebsite } from "@/lib/dashboard/projects";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  revalidateClientWorkspace,
  revalidateWebsiteWorkspace,
} from "@/lib/dashboard/revalidation";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  let returnTo = "/websites";

  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const formData = await request.formData();
    const submittedReturnTo = stringValue(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;
    const organizationId = stringValue(formData, "organizationId");

    if (!organizationId) {
      throw new Error("Client organization is required.");
    }

    const website = await createWebsite({
      database,
      input: {
        name: stringValue(formData, "name") ?? "",
        organizationId,
        primaryDomain: stringValue(formData, "primaryDomain"),
        projectId: stringValue(formData, "projectId"),
        slug: stringValue(formData, "slug"),
        status: "draft",
        theme: {
          favicon: stringValue(formData, "favicon"),
          logo: stringValue(formData, "logo"),
        },
        websiteType: stringValue(formData, "websiteType") ?? "external_legacy",
      },
      request: dashboardRequest,
    });

    returnTo = `/websites/${website.id}`;
    revalidateClientWorkspace(website.organizationId);
    revalidateWebsiteWorkspace(website.id);
  } catch (error) {
    const message = toSafeErrorMessage(error, "Website could not be created.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
