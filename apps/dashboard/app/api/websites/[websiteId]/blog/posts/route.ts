import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createBlogPost, type BlogPostInput } from "@/lib/dashboard/blog";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function stringValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolValue(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function idValues(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function postInput(formData: FormData): BlogPostInput {
  return {
    canonicalUrl: stringValue(formData, "canonicalUrl"),
    categoryIds: idValues(formData, "categoryIds"),
    content: stringValue(formData, "content") ?? "",
    excerpt: stringValue(formData, "excerpt"),
    featuredMediaId: stringValue(formData, "featuredMediaId"),
    metaDescription: stringValue(formData, "metaDescription"),
    robotsFollow: boolValue(formData, "robotsFollow"),
    robotsIndex: boolValue(formData, "robotsIndex"),
    seoTitle: stringValue(formData, "seoTitle"),
    slug: stringValue(formData, "slug"),
    tagIds: idValues(formData, "tagIds"),
    title: stringValue(formData, "title") ?? "",
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;
  let returnTo = `/websites/${websiteId}/blog/new`;
  let successTo = `/websites/${websiteId}/blog`;

  try {
    const context = await requireDashboardSessionContext();
    const dashboardRequest = createDashboardRequest(context);
    const formData = await request.formData();
    const submittedReturnTo = stringValue(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;
    const post = await createBlogPost({
      database,
      input: postInput(formData),
      request: dashboardRequest,
      websiteId,
    });
    successTo = `/websites/${websiteId}/blog/${post.id}`;

    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/blog`);
  } catch (error) {
    const message = toSafeErrorMessage(error, "Blog post could not be created.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(successTo);
}
