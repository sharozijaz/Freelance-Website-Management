import { describe, expect, it } from "vitest";
import { PermissionDeniedError } from "@agency/auth";
import {
  auditLogs,
  blogCategories,
  blogPostCategories,
  blogPosts,
  blogPostTags,
  blogTags,
} from "@agency/database/schema";
import type { BlogContentDocument } from "@agency/database/schema";
import type { MembershipRole } from "@agency/auth";
import {
  archiveBlogPost,
  createBlogCategory,
  createBlogPost,
  createBlogTag,
  deleteBlogCategory,
  deleteBlogPost,
  deleteBlogTag,
  normalizeBlogSlug,
  publishBlogPost,
  unpublishBlogPost,
} from "./blog";
import type { DashboardRequest } from "./types";

interface WebsiteRow {
  deletedAt: Date | null;
  id: string;
  organization: { id: string; name: string };
  organizationId: string;
  projects: unknown[];
  websiteType: "external_legacy" | "sharoz_connected" | "wordpress";
}

interface BlogPostRow {
  authorUserId: string | null;
  canonicalUrl: string | null;
  content: BlogContentDocument;
  deletedAt: Date | null;
  excerpt: string;
  featuredMediaId: string | null;
  id: string;
  metaDescription: string | null;
  organizationId: string;
  publishedAt: Date | null;
  robotsFollow: boolean;
  robotsIndex: boolean;
  seoTitle: string | null;
  slug: string;
  status: "archived" | "draft" | "published";
  title: string;
  updatedAt: Date;
  websiteId: string;
}

interface TaxonomyRow {
  deletedAt: Date | null;
  id: string;
  name: string;
  organizationId: string;
  slug: string;
  websiteId: string;
}

function createRequest({
  permissions = ["blog:read", "blog:create", "blog:update", "blog:publish", "blog:delete"],
  role = "client_admin",
}: {
  permissions?: string[];
  role?: MembershipRole;
} = {}): DashboardRequest {
  return {
    access: {
      activeOrganizationId: "org_a",
      canManageMembers: true,
      canReadAudit: true,
      canReadContent: true,
      canReadWebsites: true,
      canWriteContent: true,
      isAgencyUser: false,
      role,
      workspaceMode: "client",
    },
    context: {
      activeOrganizationId: "org_a",
      memberships: [
        {
          organizationId: "org_a",
          permissions,
          role,
          status: "active",
          userId: "user_a",
        },
      ],
      session: {
        activeOrganizationId: "org_a",
        expiresAt: new Date(Date.now() + 60_000),
        id: "session_a",
        userId: "user_a",
      },
      user: {
        email: "editor@example.com",
        emailVerified: true,
        id: "user_a",
        image: null,
        name: "Editor",
      },
    },
  };
}

function createDatabase({
  assignedCategory = false,
  assignedTag = false,
  mediaWebsiteId = "website_a",
  mediaDeletedAt = null,
  moduleEnabled = true,
  post,
  seedPost = true,
  seedTaxonomy = true,
  websiteType = "sharoz_connected",
}: {
  assignedCategory?: boolean;
  assignedTag?: boolean;
  mediaWebsiteId?: string | null;
  mediaDeletedAt?: Date | null;
  moduleEnabled?: boolean;
  post?: Partial<BlogPostRow>;
  seedPost?: boolean;
  seedTaxonomy?: boolean;
  websiteType?: WebsiteRow["websiteType"];
} = {}) {
  const website: WebsiteRow = {
    deletedAt: null,
    id: "website_a",
    organization: { id: "org_a", name: "Org A" },
    organizationId: "org_a",
    projects: [],
    websiteType,
  };
  const state = {
    audits: [] as Record<string, unknown>[],
    categories: seedTaxonomy
      ? ([
          {
            deletedAt: null,
            id: "category_a",
            name: "News",
            organizationId: "org_a",
            slug: "news",
            websiteId: "website_a",
          },
        ] satisfies TaxonomyRow[])
      : ([] as TaxonomyRow[]),
    postCategories: assignedCategory ? [{ categoryId: "category_a", postId: "post_a" }] : [],
    postTags: assignedTag ? [{ postId: "post_a", tagId: "tag_a" }] : [],
    posts: seedPost
      ? ([
          {
            authorUserId: "user_a",
            canonicalUrl: null,
            content: { format: "markdown", markdown: "Hello" },
            deletedAt: null,
            excerpt: "",
            featuredMediaId: null,
            id: "post_a",
            metaDescription: null,
            organizationId: "org_a",
            publishedAt: null,
            robotsFollow: true,
            robotsIndex: true,
            seoTitle: null,
            slug: "hello",
            status: "draft",
            title: "Hello",
            updatedAt: new Date("2026-01-01"),
            websiteId: "website_a",
            ...post,
          },
        ] satisfies BlogPostRow[])
      : ([] as BlogPostRow[]),
    tags: seedTaxonomy
      ? ([
          {
            deletedAt: null,
            id: "tag_a",
            name: "Launch",
            organizationId: "org_a",
            slug: "launch",
            websiteId: "website_a",
          },
        ] satisfies TaxonomyRow[])
      : ([] as TaxonomyRow[]),
  };

  function insert(table: unknown) {
    return {
      values(value: Record<string, unknown> | Record<string, unknown>[]) {
        const rows = Array.isArray(value) ? value : [value];
        const createdRows = rows.map((row) => ({
          id: `${String(state.audits.length + 1)}_id`,
          publishedAt: null,
          ...row,
        }));

        if (table === blogPosts) state.posts.push(createdRows[0] as BlogPostRow);
        if (table === blogCategories)
          state.categories.push(createdRows[0] as unknown as TaxonomyRow);
        if (table === blogTags) state.tags.push(createdRows[0] as unknown as TaxonomyRow);
        if (table === blogPostCategories) {
          state.postCategories.push(
            ...(createdRows as unknown as { categoryId: string; postId: string }[]),
          );
        }
        if (table === blogPostTags) {
          state.postTags.push(...(createdRows as unknown as { postId: string; tagId: string }[]));
        }
        if (table === auditLogs) state.audits.push(...createdRows);

        return {
          returning: () => Promise.resolve(createdRows),
        };
      },
    };
  }

  function update(table: unknown) {
    return {
      set(value: Record<string, unknown>) {
        return {
          where: () => {
            let updated: unknown[] = [];
            if (table === blogPosts) {
              state.posts[0] = { ...state.posts[0], ...value } as BlogPostRow;
              updated = [state.posts[0]];
            }
            if (table === blogCategories) {
              state.categories[0] = { ...state.categories[0], ...value } as TaxonomyRow;
              updated = [state.categories[0]];
            }
            if (table === blogTags) {
              state.tags[0] = { ...state.tags[0], ...value } as TaxonomyRow;
              updated = [state.tags[0]];
            }
            return { returning: () => Promise.resolve(updated) };
          },
        };
      },
    };
  }

  const database = {
    delete: (table: unknown) => ({
      where: () => {
        if (table === blogPostCategories) state.postCategories = [];
        if (table === blogPostTags) state.postTags = [];
        return Promise.resolve();
      },
    }),
    insert,
    query: {
      blogCategories: {
        findFirst: () =>
          Promise.resolve(state.categories.find((category) => !category.deletedAt) ?? null),
        findMany: () => Promise.resolve(state.categories.filter((category) => !category.deletedAt)),
      },
      blogPosts: {
        findFirst: () =>
          Promise.resolve(
            state.posts.find((row) => !row.deletedAt)
              ? {
                  ...state.posts.find((row) => !row.deletedAt),
                  categories: state.postCategories.map((join) => ({
                    category: state.categories.find((category) => category.id === join.categoryId),
                  })),
                  tags: state.postTags.map((join) => ({
                    tag: state.tags.find((tag) => tag.id === join.tagId),
                  })),
                  website,
                }
              : null,
          ),
      },
      blogTags: {
        findFirst: () => Promise.resolve(state.tags.find((tag) => !tag.deletedAt) ?? null),
        findMany: () => Promise.resolve(state.tags.filter((tag) => !tag.deletedAt)),
      },
      mediaAssets: {
        findFirst: () =>
          Promise.resolve(
            mediaWebsiteId === "website_a" && mediaDeletedAt === null
              ? {
                  deletedAt: mediaDeletedAt,
                  id: "media_a",
                  organizationId: "org_a",
                  websiteId: mediaWebsiteId,
                }
              : null,
          ),
      },
      websiteModules: {
        findFirst: () => Promise.resolve(moduleEnabled ? { id: "module_a" } : null),
      },
      websites: {
        findFirst: () => Promise.resolve(website),
      },
    },
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([{ value: assignedCategory || assignedTag ? 1 : 0 }]),
      }),
    }),
    transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback(database),
    update,
  };

  return { database: database as never, state };
}

describe("Blog domain helpers", () => {
  it("normalizes manual and generated slugs", () => {
    expect(normalizeBlogSlug("  Hello, World!!  ")).toBe("hello-world");
    expect(normalizeBlogSlug("---")).toBe("");
  });
});

describe("Blog post service", () => {
  it("creates a draft Blog post for an enabled Sharoz Connected website", async () => {
    const { database, state } = createDatabase({ seedPost: false });

    const post = await createBlogPost({
      database,
      input: {
        categoryIds: ["category_a"],
        content: "# Hello",
        featuredMediaId: "media_a",
        metaDescription: "SEO text",
        tagIds: ["tag_a"],
        title: "My First Post",
      },
      request: createRequest(),
      websiteId: "website_a",
    });

    expect(post.slug).toBe("my-first-post");
    expect(post.status).toBe("draft");
    expect(post.publishedAt).toBeNull();
    expect(state.postCategories).toHaveLength(1);
    expect(state.postTags).toHaveLength(1);
    expect(JSON.stringify(state.audits)).not.toContain("# Hello");
  });

  it("rejects disabled modules and unsupported website types", async () => {
    await expect(
      createBlogPost({
        database: createDatabase({ moduleEnabled: false }).database,
        input: { title: "Nope" },
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Blog module is not enabled");

    await expect(
      createBlogPost({
        database: createDatabase({ websiteType: "wordpress" }).database,
        input: { title: "Nope" },
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Blog is only available");
  });

  it("enforces permissions for viewer mutations", async () => {
    await expect(
      createBlogPost({
        database: createDatabase({ seedPost: false }).database,
        input: { title: "Nope" },
        request: createRequest({ permissions: [], role: "viewer" }),
        websiteId: "website_a",
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("rejects cross-site and archived featured media", async () => {
    await expect(
      createBlogPost({
        database: createDatabase({ mediaWebsiteId: "website_b", seedPost: false }).database,
        input: { featuredMediaId: "media_a", title: "Cross Site" },
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Featured media must belong to this website.");

    await expect(
      createBlogPost({
        database: createDatabase({
          mediaDeletedAt: new Date("2026-07-13T00:00:00.000Z"),
          seedPost: false,
        }).database,
        input: { featuredMediaId: "media_a", title: "Archived Media" },
        request: createRequest(),
        websiteId: "website_a",
      }),
    ).rejects.toThrow("Featured media must belong to this website.");
  });

  it("publishes, unpublishes, archives, updates, and soft deletes posts", async () => {
    const { database, state } = createDatabase();
    const request = createRequest();

    const published = await publishBlogPost({ database, postId: "post_a", request });
    expect(published.status).toBe("published");
    expect(published.publishedAt).toBeInstanceOf(Date);

    const draft = await unpublishBlogPost({ database, postId: "post_a", request });
    expect(draft.status).toBe("draft");
    expect(draft.publishedAt).toBeNull();

    const archived = await archiveBlogPost({ database, postId: "post_a", request });
    expect(archived.status).toBe("archived");

    const deleted = await deleteBlogPost({ database, postId: "post_a", request });
    expect(deleted.deletedAt).toBeInstanceOf(Date);
    expect(state.audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining([
        "blog_post.published",
        "blog_post.unpublished",
        "blog_post.archived",
        "blog_post.deleted",
      ]),
    );
  });
});

describe("Blog category and tag service", () => {
  it("creates categories and tags with unique Blog-owned slugs", async () => {
    const { database, state } = createDatabase({ seedPost: false, seedTaxonomy: false });
    const request = createRequest();

    const category = await createBlogCategory({
      database,
      name: "Product News",
      request,
      websiteId: "website_a",
    });
    const tag = await createBlogTag({
      database,
      name: "Launch Notes",
      request,
      websiteId: "website_a",
    });

    expect(category.slug).toBe("product-news");
    expect(tag.slug).toBe("launch-notes");
    expect(state.audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining(["blog_category.created", "blog_tag.created"]),
    );
  });

  it("rejects assigned category and tag deletion", async () => {
    await expect(
      deleteBlogCategory({
        categoryId: "category_a",
        database: createDatabase({ assignedCategory: true }).database,
        request: createRequest(),
      }),
    ).rejects.toThrow("Assigned Blog categories cannot be deleted.");

    await expect(
      deleteBlogTag({
        database: createDatabase({ assignedTag: true }).database,
        request: createRequest(),
        tagId: "tag_a",
      }),
    ).rejects.toThrow("Assigned Blog tags cannot be deleted.");
  });
});
