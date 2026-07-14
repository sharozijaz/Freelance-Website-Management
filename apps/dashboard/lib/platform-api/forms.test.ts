import { describe, expect, it } from "vitest";
import { formSubmissions } from "@agency/database/schema";
import {
  getPlatformFormBySlug,
  listPlatformForms,
  submitPlatformForm,
  supportedPublicFieldType,
} from "./forms";
import type { PlatformRequestContext } from "./auth";

function context(): PlatformRequestContext {
  return {
    credentialId: "credential_1",
    credentialLabel: "Staging",
    environmentId: "environment_1",
    environmentType: "staging",
    organizationId: "org_1",
    websiteId: "site_1",
  };
}

function field({
  name,
  required = false,
  type = "text",
}: {
  name: string;
  required?: boolean;
  type?: string;
}) {
  return {
    createdAt: new Date("2026-07-13T00:00:00.000Z"),
    defaultValue: null,
    deletedAt: null,
    fieldOrder: name === "email" ? 1 : 0,
    formId: "form_contact",
    helpText: null,
    id: `field_${name}`,
    label: name,
    name,
    options: type === "select" ? [{ label: "Sales", value: "sales" }] : [],
    organizationId: "org_1",
    placeholder: null,
    required,
    type,
    updatedAt: new Date("2026-07-13T00:00:00.000Z"),
    validation: {},
    websiteId: "site_1",
  };
}

function form({
  deletedAt = null,
  fields = [
    field({ name: "name", required: true }),
    field({ name: "email", required: true, type: "email" }),
  ],
  organizationId = "org_1",
  slug = "contact",
  status = "published",
  websiteId = "site_1",
}: {
  deletedAt?: Date | null;
  fields?: ReturnType<typeof field>[];
  organizationId?: string;
  slug?: string;
  status?: "archived" | "draft" | "published";
  websiteId?: string;
} = {}) {
  return {
    configuration: { secret: "hidden", successMessage: "Thanks." },
    createdAt: new Date("2026-07-13T00:00:00.000Z"),
    deletedAt,
    fields,
    id: `form_${slug}`,
    name: "Contact",
    organizationId,
    slug,
    status,
    updatedAt: new Date("2026-07-13T00:00:00.000Z"),
    websiteId,
  };
}

function createDatabase({
  enabled = true,
  forms = [form()],
}: {
  enabled?: boolean;
  forms?: ReturnType<typeof form>[];
} = {}) {
  const submissions: Record<string, unknown>[] = [];
  const visibleForms = forms.filter(
    (item) =>
      item.organizationId === "org_1" &&
      item.websiteId === "site_1" &&
      item.status === "published" &&
      item.deletedAt === null,
  );

  return {
    insert: (table: unknown) => ({
      values(value: Record<string, unknown>) {
        if (table === formSubmissions) {
          const row = {
            id: "submission_1",
            submittedAt: new Date("2026-07-13T00:00:00.000Z"),
            ...value,
          };
          submissions.push(row);
          return { returning: () => Promise.resolve([row]) };
        }

        return { returning: () => Promise.resolve([]) };
      },
    }),
    query: {
      forms: {
        findFirst: () => Promise.resolve(visibleForms[0] ?? null),
        findMany: () => Promise.resolve(visibleForms),
      },
      websiteModules: {
        findFirst: () => Promise.resolve(enabled ? { id: "module_forms" } : null),
      },
      websites: {
        findFirst: () =>
          Promise.resolve({
            id: "site_1",
            organizationId: "org_1",
            websiteType: "sharoz_connected",
          }),
      },
    },
    submissions,
  } as never;
}

describe("Platform Forms", () => {
  it("maps only supported public field types", () => {
    expect(supportedPublicFieldType("phone")).toBe("tel");
    expect(supportedPublicFieldType("radio")).toBeNull();
  });

  it("requires the Forms module and lists only active scoped forms", async () => {
    await expect(
      listPlatformForms({ context: context(), database: createDatabase({ enabled: false }) }),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENABLED" });

    const result = await listPlatformForms({
      context: context(),
      database: createDatabase({
        forms: [
          form(),
          form({ slug: "draft", status: "draft" }),
          form({ deletedAt: new Date("2026-07-13T00:00:00.000Z"), slug: "deleted" }),
          form({ slug: "other-site", websiteId: "site_2" }),
          form({ organizationId: "org_2", slug: "other-org" }),
        ],
      }),
    });

    expect(result.items.map((item) => item.slug)).toEqual(["contact"]);
    expect(JSON.stringify(result)).not.toContain("hidden");
  });

  it("returns NOT_FOUND for hidden or cross-site slugs", async () => {
    await expect(
      getPlatformFormBySlug({
        context: context(),
        database: createDatabase({ forms: [form({ slug: "contact", websiteId: "site_2" })] }),
        slug: "contact",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("validates required, unknown, email, select, and checkbox submissions", async () => {
    const database = createDatabase({
      forms: [
        form({
          fields: [
            field({ name: "email", required: true, type: "email" }),
            field({ name: "topic", type: "select" }),
            field({ name: "agree", type: "checkbox" }),
          ],
        }),
      ],
    });
    const request = new Request("https://platform.test/api/platform/v1/forms/contact/submissions");

    await expect(
      submitPlatformForm({
        context: context(),
        database,
        input: { fields: { email: "" } },
        request,
        slug: "contact",
      }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(
      submitPlatformForm({
        context: context(),
        database,
        input: { fields: { email: "client@example.com", role: "admin" } },
        request,
        slug: "contact",
      }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(
      submitPlatformForm({
        context: context(),
        database,
        input: { fields: { email: "bad", topic: "sales" } },
        request,
        slug: "contact",
      }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(
      submitPlatformForm({
        context: context(),
        database,
        input: { fields: { agree: "yes", email: "client@example.com" } },
        request,
        slug: "contact",
      }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("stores valid submissions with environment source metadata", async () => {
    const database = createDatabase();
    const request = new Request("https://platform.test/api/platform/v1/forms/contact/submissions", {
      headers: { "user-agent": "vitest" },
    });

    const result = await submitPlatformForm({
      context: context(),
      database,
      input: { fields: { email: "client@example.com", name: "Client" } },
      request,
      slug: "contact",
    });

    expect(result).toMatchObject({ submissionId: "submission_1" });
    expect(JSON.stringify(database)).not.toContain("credential_1");
  });
});
