import { describe, expect, it } from "vitest";
import { presentAuditLog } from "./activity";

describe("activity presentation", () => {
  it("maps known audit events to human-readable activity", () => {
    const activity = presentAuditLog({
      action: "invitation.created",
      actor: { email: "sharoz@example.com", name: "Sharoz" },
      actorUserId: "user_1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "audit_1",
      organizationId: "org_1",
      resourceId: "invite_1",
      resourceType: "invitation",
    });

    expect(activity.description).toBe("Sharoz invited a team member");
    expect(activity.tone).toBe("info");
  });

  it("degrades unknown audit events safely", () => {
    const activity = presentAuditLog({
      action: "unknown.internal_event",
      actor: null,
      actorUserId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "audit_1",
      organizationId: "org_1",
      resourceId: null,
      resourceType: "website_setting",
    });

    expect(activity.description).toBe("Someone updated website setting");
  });

  it("maps project and website audit events", () => {
    const projectActivity = presentAuditLog({
      action: "project.status_changed",
      actor: { email: "admin@example.com", name: "Admin" },
      actorUserId: "user_1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "audit_2",
      organizationId: "org_1",
      resourceId: "project_1",
      resourceType: "project",
    });
    const websiteActivity = presentAuditLog({
      action: "website.connected_to_project",
      actor: { email: "admin@example.com", name: "Admin" },
      actorUserId: "user_1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "audit_3",
      organizationId: "org_1",
      resourceId: "website_1",
      resourceType: "website",
    });

    expect(projectActivity.description).toBe("Admin changed a project status");
    expect(websiteActivity.description).toBe("Admin connected a website to a project");
  });

  it("keeps form submission activity privacy-safe", () => {
    const activity = presentAuditLog({
      action: "form.submission_received",
      actor: null,
      actorUserId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "audit_4",
      organizationId: "org_1",
      resourceId: "submission_1",
      resourceType: "form_submission",
    });

    expect(activity.description).toBe("New form submission received");
    expect(activity.description).not.toContain("submission_1");
  });
});
