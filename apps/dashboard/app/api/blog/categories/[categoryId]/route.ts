import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { deleteBlogCategory, updateBlogCategory } from "@/lib/dashboard/blog";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const { categoryId } = await params;
  let returnTo = "/websites";

  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const formData = await request.formData();
    const submittedReturnTo = stringValue(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;
    const action = stringValue(formData, "action") ?? "save";

    if (action === "delete") {
      await deleteBlogCategory({ categoryId, database, request: dashboardRequest });
    } else {
      await updateBlogCategory({
        categoryId,
        database,
        name: stringValue(formData, "name") ?? "",
        request: dashboardRequest,
        slug: stringValue(formData, "slug"),
      });
    }
    revalidatePath(returnTo);
  } catch (error) {
    const message = toSafeErrorMessage(error, "Blog category could not be updated.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
