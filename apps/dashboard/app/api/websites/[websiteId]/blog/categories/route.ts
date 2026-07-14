import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createBlogCategory } from "@/lib/dashboard/blog";
import { createDashboardRequest } from "@/lib/dashboard/access";
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
  let returnTo = `/websites/${websiteId}/blog/categories`;

  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const formData = await request.formData();
    const submittedReturnTo = stringValue(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;
    await createBlogCategory({
      database,
      name: stringValue(formData, "name") ?? "",
      request: dashboardRequest,
      slug: stringValue(formData, "slug"),
      websiteId,
    });
    revalidatePath(returnTo);
  } catch (error) {
    const message = toSafeErrorMessage(error, "Blog category could not be created.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
