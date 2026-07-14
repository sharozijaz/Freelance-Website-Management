import { redirect } from "next/navigation";
import { acceptInvitation } from "@agency/auth/organizations";
import { database } from "@/lib/auth";
import { toSafeErrorMessage } from "@/lib/errors";
import { getDashboardSessionContext } from "@/lib/session";

function getRequired(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = getRequired(formData, "token");

  try {
    const context = await getDashboardSessionContext();
    const email = getRequired(formData, "email");
    const nameValue = formData.get("name");

    const name =
      typeof nameValue === "string" && nameValue.trim().length > 0 ? nameValue.trim() : undefined;

    await acceptInvitation({
      database,
      input: {
        email,
        token,
        ...(context?.user.id ? { userId: context.user.id } : {}),
        ...(name ? { name } : {}),
      },
    });
  } catch (error) {
    const message = toSafeErrorMessage(error, "Invitation could not be accepted.");
    redirect(`/invite/${token}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/invite/${token}?accepted=1`);
}
