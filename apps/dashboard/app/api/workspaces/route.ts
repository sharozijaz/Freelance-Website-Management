import { redirect } from "next/navigation";
import { createOrganization } from "@agency/auth/organizations";
import { database } from "@/lib/auth";
import { requireDashboardSessionContext } from "@/lib/session";

function value(formData: FormData, key: string): string | undefined {
  const item = formData.get(key);

  return typeof item === "string" && item.trim().length > 0 ? item.trim() : undefined;
}

export async function POST(request: Request) {
  let returnTo = "/clients";

  try {
    const context = await requireDashboardSessionContext();
    const formData = await request.formData();
    const submittedReturnTo = value(formData, "returnTo");
    returnTo = submittedReturnTo?.startsWith("/") ? submittedReturnTo : returnTo;

    const contactEmail = value(formData, "contactEmail");
    const slug = value(formData, "slug");

    await createOrganization({
      context,
      database,
      input: {
        name: value(formData, "name") ?? "",
        ...(contactEmail ? { contactEmail } : {}),
        ...(slug ? { slug } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace could not be created.";
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(returnTo);
}
