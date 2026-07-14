import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { disableWebsiteModule, enableWebsiteModule, parseModuleKey } from "@/lib/dashboard/modules";
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
  let returnTo = `/websites/${websiteId}/modules`;

  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const formData = await request.formData();
    const submittedReturnTo = stringValue(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;
    const action = stringValue(formData, "action");
    const moduleKey = parseModuleKey(stringValue(formData, "moduleKey"));

    if (action === "enable") {
      await enableWebsiteModule({ database, moduleKey, request: dashboardRequest, websiteId });
    } else if (action === "disable") {
      await disableWebsiteModule({ database, moduleKey, request: dashboardRequest, websiteId });
    } else {
      throw new Error("Module action is not supported.");
    }

    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/modules`);
  } catch (error) {
    const message = toSafeErrorMessage(error, "Website module could not be updated.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
