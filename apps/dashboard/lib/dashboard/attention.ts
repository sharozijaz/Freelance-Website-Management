import type { AttentionItem } from "./types";
import type { SeoFinding } from "@agency/lib/seo";
import { toDashboardDate } from "./dates";

const oneDayMs = 24 * 60 * 60 * 1000;

export function getInvitationAttentionItems(
  invitations: {
    email: string;
    expiresAt: Date;
    id: string;
    organizationId: string;
    status: string;
  }[],
  now = new Date(),
): AttentionItem[] {
  return invitations
    .filter((invitation) => invitation.status === "pending")
    .filter((invitation) => {
      const expiresAt = toDashboardDate(invitation.expiresAt);
      return Boolean(expiresAt && expiresAt.getTime() - now.getTime() <= 2 * oneDayMs);
    })
    .map((invitation) => ({
      createdAt: toDashboardDate(invitation.expiresAt) ?? now,
      description: `${invitation.email} has an invitation expiring soon.`,
      id: `invitation-${invitation.id}`,
      organizationId: invitation.organizationId,
      severity: "warning",
      title: "Invitation nearing expiration",
      type: "invitation_expiring",
    }));
}

export function getWebsiteAttentionItems(
  websites: {
    deploymentStatus: string;
    id: string;
    name: string;
    organizationId: string;
    primaryDomain: string | null;
    projectId?: string | null;
    status: string;
    updatedAt: Date;
  }[],
): AttentionItem[] {
  return websites.flatMap((website) => {
    const items: AttentionItem[] = [];

    if (website.status === "active" && !website.primaryDomain) {
      items.push({
        actionHref: `/websites?organizationId=${website.organizationId}`,
        createdAt: website.updatedAt,
        description: `${website.name} is active but has no primary domain.`,
        id: `domain-${website.id}`,
        organizationId: website.organizationId,
        severity: "warning",
        title: "Website missing primary domain",
        type: "missing_primary_domain",
      });
    }

    if (website.status === "active" && !website.projectId) {
      items.push({
        actionHref: `/websites/${website.id}`,
        createdAt: website.updatedAt,
        description: `${website.name} is active but is not connected to a delivery project.`,
        id: `website-project-${website.id}`,
        organizationId: website.organizationId,
        severity: "info",
        title: "Website missing connected project",
        type: "website_missing_project",
      });
    }

    if (website.status === "active" && !website.primaryDomain) {
      items.push({
        actionHref: `/websites/${website.id}`,
        createdAt: website.updatedAt,
        description: `${website.name} is live or active without a primary domain.`,
        id: `website-live-domain-${website.id}`,
        organizationId: website.organizationId,
        severity: "critical",
        title: "Live website without domain",
        type: "website_live_without_domain",
      });
    }

    if (website.deploymentStatus === "failed") {
      items.push({
        actionHref: `/websites?organizationId=${website.organizationId}`,
        createdAt: website.updatedAt,
        description: `${website.name} has a failed deployment status.`,
        id: `deployment-${website.id}`,
        organizationId: website.organizationId,
        severity: "critical",
        title: "Deployment needs attention",
        type: "deployment_failed",
      });
    }

    return items;
  });
}

export function getProjectAttentionItems(
  projects: {
    figmaUrl: string | null;
    id: string;
    launchTargetAt: Date | null;
    metadata: Record<string, unknown>;
    name: string;
    organizationId: string;
    status: string;
    updatedAt: Date;
  }[],
  now = new Date(),
): AttentionItem[] {
  return projects.flatMap((project) => {
    const items: AttentionItem[] = [];
    const launchDate = toDashboardDate(project.launchTargetAt);
    const updatedAt = toDashboardDate(project.updatedAt) ?? now;
    const launchTime = launchDate?.getTime();
    const statusChangedValue = project.metadata.statusChangedAt;
    const statusChangedAt =
      toDashboardDate(statusChangedValue as string | null | undefined) ?? updatedAt;

    if (
      launchTime &&
      launchTime < now.getTime() &&
      !["live", "completed", "cancelled"].includes(project.status)
    ) {
      items.push({
        actionHref: `/projects/${project.id}`,
        createdAt: launchDate ?? updatedAt,
        description: `${project.name} passed its target launch date.`,
        id: `project-overdue-${project.id}`,
        organizationId: project.organizationId,
        severity: "critical",
        title: "Project launch overdue",
        type: "project_target_overdue",
      });
    } else if (
      launchTime &&
      launchTime - now.getTime() <= 7 * oneDayMs &&
      !["live", "completed", "cancelled"].includes(project.status)
    ) {
      items.push({
        actionHref: `/projects/${project.id}`,
        createdAt: launchDate ?? updatedAt,
        description: `${project.name} is approaching its target launch date.`,
        id: `project-approaching-${project.id}`,
        organizationId: project.organizationId,
        severity: "warning",
        title: "Project launch approaching",
        type: "project_target_approaching",
      });
    }

    if (project.status === "design" && !project.figmaUrl) {
      items.push({
        actionHref: `/projects/${project.id}`,
        createdAt: updatedAt,
        description: `${project.name} is in design without a Figma URL.`,
        id: `project-figma-${project.id}`,
        organizationId: project.organizationId,
        severity: "warning",
        title: "Project missing Figma URL",
        type: "project_missing_figma",
      });
    }

    if (
      !["on_hold", "completed", "cancelled"].includes(project.status) &&
      now.getTime() - statusChangedAt.getTime() > 21 * oneDayMs
    ) {
      items.push({
        actionHref: `/projects/${project.id}`,
        createdAt: statusChangedAt,
        description: `${project.name} has not changed stage recently.`,
        id: `project-stuck-${project.id}`,
        organizationId: project.organizationId,
        severity: "info",
        title: "Project may be stuck",
        type: "project_stage_stuck",
      });
    }

    return items;
  });
}

export function getOrganizationAttentionItems(
  organizations: { id: string; name: string; status: string; updatedAt: Date }[],
): AttentionItem[] {
  return organizations
    .filter((organization) => organization.status === "suspended")
    .map((organization) => ({
      createdAt: organization.updatedAt,
      description: `${organization.name} is currently suspended.`,
      id: `organization-${organization.id}`,
      organizationId: organization.id,
      severity: "critical",
      title: "Suspended client workspace",
      type: "suspended_organization",
    }));
}

export function getContentAttentionItems(
  content: {
    id: string;
    organizationId: string;
    status: string;
    title: string;
    type: "page" | "post";
    updatedAt: Date;
  }[],
): AttentionItem[] {
  return content
    .filter((item) => item.status === "draft")
    .map((item) => ({
      actionHref: `/content?organizationId=${item.organizationId}`,
      createdAt: item.updatedAt,
      description: `${item.title} is still a draft ${item.type}.`,
      id: `content-${item.type}-${item.id}`,
      organizationId: item.organizationId,
      severity: "info",
      title: "Draft content",
      type: "draft_content",
    }));
}

export function getMediaAttentionItems(
  media: {
    altText: string | null;
    filename: string;
    id: string;
    metadata: Record<string, unknown>;
    mimeType: string;
    organizationId: string;
    websiteId: string | null;
  }[],
  options: { largeImageBytes?: number } = {},
): AttentionItem[] {
  const largeImageBytes = options.largeImageBytes ?? 1_000_000;

  return media.flatMap((asset) => {
    const items: AttentionItem[] = [];
    const fileSize = typeof asset.metadata.fileSize === "number" ? asset.metadata.fileSize : null;

    if (asset.mimeType.startsWith("image/") && !asset.altText?.trim()) {
      items.push({
        actionHref: "/media",
        description: `${asset.filename} is missing alt text.`,
        id: `media-alt-${asset.id}`,
        organizationId: asset.organizationId,
        severity: "warning",
        title: "Image missing alt text",
        type: "media_missing_alt",
      });
    }

    if (!asset.websiteId) {
      items.push({
        actionHref: "/media",
        description: `${asset.filename} is not assigned to a website.`,
        id: `media-website-${asset.id}`,
        organizationId: asset.organizationId,
        severity: "info",
        title: "Media not assigned to website",
        type: "media_missing_website",
      });
    }

    if (asset.mimeType.startsWith("image/") && fileSize && fileSize > largeImageBytes) {
      items.push({
        actionHref: "/media",
        description: `${asset.filename} is larger than the configured image threshold.`,
        id: `media-large-${asset.id}`,
        organizationId: asset.organizationId,
        severity: "info",
        title: "Large image file",
        type: "large_image",
      });
    }

    if (
      !asset.mimeType.startsWith("image/") &&
      !asset.mimeType.startsWith("video/") &&
      asset.mimeType !== "application/pdf" &&
      !asset.mimeType.includes("word") &&
      !asset.mimeType.includes("presentation") &&
      !asset.mimeType.includes("spreadsheet")
    ) {
      items.push({
        actionHref: "/media",
        description: `${asset.filename} has a media type that may not be supported.`,
        id: `media-type-${asset.id}`,
        organizationId: asset.organizationId,
        severity: "warning",
        title: "Potentially unsupported media type",
        type: "unsupported_media",
      });
    }

    return items;
  });
}

export function getSeoAttentionItems(
  findings: SeoFinding[],
  websiteOrganizationIds = new Map<string, string>(),
): AttentionItem[] {
  return findings
    .filter((finding) => finding.severity === "error")
    .filter((finding) =>
      ["invalid_canonical_url", "missing_canonical_url", "published_noindex"].includes(
        finding.ruleId,
      ),
    )
    .map((finding) => ({
      actionHref: "/seo",
      description: finding.description,
      id: `seo-${finding.ruleId}-${finding.resourceId}`,
      organizationId: websiteOrganizationIds.get(finding.websiteId) ?? finding.websiteId,
      severity: "warning",
      title: finding.title,
      type: "seo_error",
    }));
}
