import { describe, expect, it } from "vitest";
import {
  getContentAttentionItems,
  getInvitationAttentionItems,
  getMediaAttentionItems,
  getProjectAttentionItems,
  getWebsiteAttentionItems,
} from "./attention";

describe("attention rules", () => {
  it("flags pending invitations close to expiration", () => {
    const items = getInvitationAttentionItems(
      [
        {
          email: "client@example.com",
          expiresAt: new Date("2026-01-02T00:00:00.000Z"),
          id: "invite_1",
          organizationId: "org_1",
          status: "pending",
        },
      ],
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.type).toBe("invitation_expiring");
  });

  it("flags active websites missing primary domains and failed deployments", () => {
    const items = getWebsiteAttentionItems([
      {
        deploymentStatus: "failed",
        id: "site_1",
        name: "Acme",
        organizationId: "org_1",
        primaryDomain: null,
        status: "active",
        updatedAt: new Date(),
      },
    ]);

    expect(items.map((item) => item.type)).toEqual([
      "missing_primary_domain",
      "website_missing_project",
      "website_live_without_domain",
      "deployment_failed",
    ]);
  });

  it("flags draft content without treating published content as attention", () => {
    const items = getContentAttentionItems([
      {
        id: "page_1",
        organizationId: "org_1",
        status: "draft",
        title: "Home",
        type: "page",
        updatedAt: new Date(),
      },
      {
        id: "post_1",
        organizationId: "org_1",
        status: "published",
        title: "Launch",
        type: "post",
        updatedAt: new Date(),
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Draft content");
  });

  it("flags project launch and design workflow attention", () => {
    const items = getProjectAttentionItems(
      [
        {
          figmaUrl: null,
          id: "project_1",
          launchTargetAt: new Date("2026-01-01T00:00:00.000Z"),
          metadata: { statusChangedAt: "2025-12-01T00:00:00.000Z" },
          name: "Acme Website",
          organizationId: "org_1",
          status: "design",
          updatedAt: new Date("2025-12-01T00:00:00.000Z"),
        },
      ],
      new Date("2026-01-02T00:00:00.000Z"),
    );

    expect(items.map((item) => item.type)).toContain("project_target_overdue");
    expect(items.map((item) => item.type)).toContain("project_missing_figma");
    expect(items.map((item) => item.type)).toContain("project_stage_stuck");
  });

  it("flags media quality and assignment issues", () => {
    const items = getMediaAttentionItems(
      [
        {
          altText: "",
          filename: "hero.jpg",
          id: "media_1",
          metadata: { fileSize: 2_000 },
          mimeType: "image/jpeg",
          organizationId: "org_1",
          websiteId: null,
        },
        {
          altText: null,
          filename: "archive.bin",
          id: "media_2",
          metadata: {},
          mimeType: "application/octet-stream",
          organizationId: "org_1",
          websiteId: "site_1",
        },
      ],
      { largeImageBytes: 1_000 },
    );

    expect(items.map((item) => item.type)).toEqual([
      "media_missing_alt",
      "media_missing_website",
      "large_image",
      "unsupported_media",
    ]);
  });
});
