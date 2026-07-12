import { cookies, headers } from "next/headers";
import { getSessionContext } from "@agency/auth/server";
import { activeOrganizationCookieName } from "@agency/auth/session";
import { auth, database } from "./auth";

export async function getDashboardSessionContext() {
  const cookieStore = await cookies();
  const activeOrganizationId = cookieStore.get(activeOrganizationCookieName)?.value ?? null;

  return getSessionContext({
    activeOrganizationId,
    auth,
    database,
    headers: await headers(),
  });
}

export async function requireDashboardSessionContext() {
  const context = await getDashboardSessionContext();

  if (!context) {
    throw new Error("Authentication is required.");
  }

  return context;
}
