import { redirect } from "next/navigation";
import { createProject } from "@/lib/dashboard/projects";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import {
  revalidateClientWorkspace,
  revalidateProjectWorkspace,
} from "@/lib/dashboard/revalidation";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateValue(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function POST(request: Request) {
  let returnTo = "/projects";

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

    const project = await createProject({
      database,
      input: {
        figmaUrl: stringValue(formData, "figmaUrl"),
        internalNotes: stringValue(formData, "internalNotes"),
        launchTargetAt: dateValue(stringValue(formData, "launchTargetAt")),
        name: stringValue(formData, "name") ?? "",
        organizationId,
        slug: stringValue(formData, "slug"),
        websiteId: stringValue(formData, "websiteId"),
      },
      request: dashboardRequest,
    });

    returnTo = `/projects/${project.id}`;
    revalidateClientWorkspace(project.organizationId);
    revalidateProjectWorkspace(project.id);
  } catch (error) {
    const message = toSafeErrorMessage(error, "Project could not be created.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
