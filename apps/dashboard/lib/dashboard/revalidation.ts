import { revalidatePath } from "next/cache";

const dashboardOverviewPaths = ["/", "/clients", "/projects", "/websites", "/content"] as const;

export function revalidateDashboardOverview() {
  for (const path of dashboardOverviewPaths) {
    revalidatePath(path);
  }
}

export function revalidateClientWorkspace(organizationId: string) {
  revalidateDashboardOverview();
  revalidatePath(`/clients/${organizationId}`);
  revalidatePath("/settings");
}

export function revalidateProjectWorkspace(projectId?: string | null) {
  revalidateDashboardOverview();
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
}

export function revalidateWebsiteWorkspace(websiteId?: string | null) {
  revalidateDashboardOverview();
  revalidatePath("/domains");
  revalidatePath("/deployments");
  revalidatePath("/forms");
  revalidatePath("/media");
  revalidatePath("/seo");

  if (!websiteId) {
    return;
  }

  revalidatePath(`/websites/${websiteId}`);
  revalidatePath(`/websites/${websiteId}/blog`);
  revalidatePath(`/websites/${websiteId}/domains`);
  revalidatePath(`/websites/${websiteId}/forms`);
  revalidatePath(`/websites/${websiteId}/hosting`);
  revalidatePath(`/websites/${websiteId}/launch`);
  revalidatePath(`/websites/${websiteId}/media`);
  revalidatePath(`/websites/${websiteId}/modules`);
  revalidatePath(`/websites/${websiteId}/seo`);
}

export function revalidateFormsWorkspace(websiteId?: string | null, formId?: string | null) {
  revalidateWebsiteWorkspace(websiteId);
  revalidatePath("/submissions");

  if (websiteId && formId) {
    revalidatePath(`/websites/${websiteId}/forms/${formId}/submissions`);
  }
}
