import { redirect } from "next/navigation";
import {
  archiveProject,
  isProjectStatus,
  transitionProject,
  updateProject,
} from "@/lib/dashboard/projects";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateValue(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  let returnTo = `/projects/${projectId}`;

  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const formData = await request.formData();
    const submittedReturnTo = stringValue(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;
    const action = stringValue(formData, "action");

    if (action === "transition") {
      const status = stringValue(formData, "status");
      if (!status || !isProjectStatus(status)) {
        throw new Error("Invalid project status.");
      }
      await transitionProject({ database, projectId, request: dashboardRequest, status });
    } else if (action === "archive") {
      await archiveProject({ database, projectId, request: dashboardRequest });
      returnTo = "/projects";
    } else {
      await updateProject({
        database,
        input: {
          figmaUrl: stringValue(formData, "figmaUrl"),
          internalNotes: stringValue(formData, "internalNotes"),
          launchTargetAt: dateValue(stringValue(formData, "launchTargetAt")),
          name: stringValue(formData, "name"),
          websiteId: stringValue(formData, "websiteId"),
        },
        projectId,
        request: dashboardRequest,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project could not be updated.";
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
