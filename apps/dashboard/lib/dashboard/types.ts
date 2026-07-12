import type { MembershipRole, SessionContext } from "@agency/auth";

export type DashboardWorkspaceMode = "agency" | "client";

export interface DashboardSearchParams {
  organizationId?: string;
  page: number;
  query: string;
  sort: string;
  status: string;
}

export interface DashboardAccess {
  activeOrganizationId: string | null;
  canManageMembers: boolean;
  canReadAudit: boolean;
  canReadContent: boolean;
  canReadWebsites: boolean;
  canWriteContent: boolean;
  isAgencyUser: boolean;
  role: MembershipRole | "agency";
  workspaceMode: DashboardWorkspaceMode;
}

export interface DashboardRequest {
  access: DashboardAccess;
  context: SessionContext;
}

export interface ActivityItem {
  actor: string;
  description: string;
  id: string;
  occurredAt: Date;
  organizationId: string;
  resourceId: string | null;
  resourceType: string;
  tone: "default" | "success" | "warning" | "error" | "info";
}

export interface AttentionItem {
  actionHref?: string;
  createdAt?: Date;
  description: string;
  id: string;
  organizationId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  type:
    | "deployment_failed"
    | "draft_content"
    | "invitation_expiring"
    | "large_image"
    | "media_missing_alt"
    | "media_missing_website"
    | "unsupported_media"
    | "missing_primary_domain"
    | "project_missing_figma"
    | "project_stage_stuck"
    | "project_target_approaching"
    | "project_target_overdue"
    | "seo_error"
    | "website_live_without_domain"
    | "website_missing_project"
    | "suspended_organization";
}

export interface ClientListItem {
  id: string;
  lastActivityAt: Date | null;
  memberCount: number;
  name: string;
  slug: string;
  status: string;
  updatedAt: Date;
  websiteCount: number;
}

export interface WebsiteListItem {
  deploymentStatus: string;
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  primaryDomain: string | null;
  projectId?: string | null;
  projectName?: string | null;
  productionUrl: string | null;
  status: string;
  updatedAt: Date;
}

export interface ProjectListItem {
  figmaUrl: string | null;
  id: string;
  launchTargetAt: Date | null;
  name: string;
  organizationId: string;
  organizationName: string;
  status: string;
  updatedAt: Date;
  websiteId: string | null;
  websiteName: string | null;
}

export interface ContentListItem {
  id: string;
  organizationId: string;
  slug: string;
  status: string;
  title: string;
  type: "page" | "post";
  updatedAt: Date;
  websiteId: string;
}
