import type { ActivityItem } from "./types";
import { toDashboardDate } from "./dates";

interface AuditLogRow {
  action: string;
  actor?: { name: string | null; email: string } | null;
  actorUserId: string | null;
  createdAt: Date | string;
  id: string;
  organizationId: string;
  resourceId: string | null;
  resourceType: string;
}

function actorName(row: AuditLogRow) {
  return row.actor?.name ?? row.actor?.email ?? "Someone";
}

export function presentAuditLog(row: AuditLogRow): ActivityItem {
  const actor = actorName(row);

  const descriptions: Record<string, Pick<ActivityItem, "description" | "tone">> = {
    "organization.created": {
      description: `${actor} created a client workspace`,
      tone: "success",
    },
    "organization.switched": {
      description: `${actor} opened this workspace`,
      tone: "default",
    },
    "invitation.created": {
      description: `${actor} invited a team member`,
      tone: "info",
    },
    "invitation.accepted": {
      description: `${actor} accepted an invitation`,
      tone: "success",
    },
    "invitation.revoked": {
      description: `${actor} revoked an invitation`,
      tone: "warning",
    },
    "membership.role_changed": {
      description: `${actor} changed a member role`,
      tone: "info",
    },
    "membership.suspended": {
      description: `${actor} suspended a member`,
      tone: "warning",
    },
    "membership.reactivated": {
      description: `${actor} reactivated a member`,
      tone: "success",
    },
    "membership.removed": {
      description: `${actor} removed a member`,
      tone: "warning",
    },
    "page.published": {
      description: `${actor} published a page`,
      tone: "success",
    },
    "project.created": {
      description: `${actor} created a project`,
      tone: "success",
    },
    "project.updated": {
      description: `${actor} updated a project`,
      tone: "info",
    },
    "project.status_changed": {
      description: `${actor} changed a project status`,
      tone: "info",
    },
    "website.created": {
      description: `${actor} created a website`,
      tone: "success",
    },
    "website.updated": {
      description: `${actor} updated a website`,
      tone: "info",
    },
    "website.connected_to_project": {
      description: `${actor} connected a website to a project`,
      tone: "info",
    },
    "website.status_changed": {
      description: `${actor} changed a website status`,
      tone: "info",
    },
    "content.updated": {
      description: `${actor} updated content`,
      tone: "info",
    },
    "seo.settings_updated": {
      description: `${actor} updated SEO settings`,
      tone: "info",
    },
    "seo.metadata_updated": {
      description: `${actor} updated SEO metadata`,
      tone: "info",
    },
    "seo.canonical_updated": {
      description: `${actor} updated a canonical URL`,
      tone: "info",
    },
    "seo.robots_updated": {
      description: `${actor} updated robots settings`,
      tone: "info",
    },
    "media.uploaded": {
      description: `${actor} uploaded media`,
      tone: "success",
    },
    "media.updated": {
      description: `${actor} updated media`,
      tone: "info",
    },
    "form.created": {
      description: `${actor} created a form`,
      tone: "success",
    },
    "form.updated": {
      description: `${actor} updated a form`,
      tone: "info",
    },
    "form.submission_received": {
      description: "New form submission received",
      tone: "info",
    },
    "submission.marked_read": {
      description: `${actor} marked a submission as read`,
      tone: "success",
    },
    "submission.archived": {
      description: `${actor} archived a submission`,
      tone: "warning",
    },
    "submission.marked_spam": {
      description: `${actor} marked a submission as spam`,
      tone: "warning",
    },
  };

  const mapped = descriptions[row.action] ?? {
    description: `${actor} updated ${row.resourceType.replaceAll("_", " ")}`,
    tone: "default" as const,
  };

  return {
    actor,
    description: mapped.description,
    id: row.id,
    occurredAt: toDashboardDate(row.createdAt) ?? new Date(0),
    organizationId: row.organizationId,
    resourceId: row.resourceId,
    resourceType: row.resourceType,
    tone: mapped.tone,
  };
}
