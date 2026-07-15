import { redirect } from "next/navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { revalidateWebsiteWorkspace } from "@/lib/dashboard/revalidation";
import {
  defaultWebsiteSeoSettings,
  updateWebsiteSeoSettings,
  type WebsiteSeoSettings,
} from "@/lib/dashboard/seo";
import { toSafeErrorMessage } from "@/lib/errors";
import { requireDashboardSessionContext } from "@/lib/session";

function value(formData: FormData, key: string): string | null {
  const item = formData.get(key);

  return typeof item === "string" && item.trim().length > 0 ? item.trim() : null;
}

function urlValue(formData: FormData, key: string): string | null {
  const text = value(formData, key);
  if (!text) return null;

  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("URL must use http or https.");
    }
    return url.toString();
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;
  const returnTo = `/websites/${websiteId}/seo`;

  try {
    const context = await requireDashboardSessionContext();
    const formData = await request.formData();
    const twitterCard = value(formData, "twitterCard");
    const input: WebsiteSeoSettings = {
      canonicalBaseUrl: urlValue(formData, "canonicalBaseUrl"),
      defaultMetaDescription: value(formData, "defaultMetaDescription"),
      defaultOgImage: urlValue(formData, "defaultOgImage"),
      robotsFollow: formData.has("robotsFollow"),
      robotsIndex: formData.has("robotsIndex"),
      siteTitle: value(formData, "siteTitle"),
      socialImage: urlValue(formData, "socialImage"),
      titleTemplate: value(formData, "titleTemplate"),
      twitterCard:
        twitterCard === "summary" || twitterCard === "summary_large_image"
          ? twitterCard
          : defaultWebsiteSeoSettings.twitterCard,
    };

    await updateWebsiteSeoSettings({
      database,
      input,
      request: createDashboardRequest(context),
      websiteId,
    });
    revalidateWebsiteWorkspace(websiteId);
  } catch (error) {
    const message = toSafeErrorMessage(error, "SEO settings could not be saved.");
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
