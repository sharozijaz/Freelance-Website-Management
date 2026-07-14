import { describe, expect, it } from "vitest";
import {
  getBlogVisibilityPolicy,
  getPlatformBlogPostBySlug,
  listPlatformBlogCategories,
  listPlatformBlogPosts,
  listPlatformBlogTags,
} from "./blog";
import { PlatformApiError } from "./errors";
import type { PlatformRequestContext } from "./auth";

function context(environmentType: "production" | "staging" = "production"): PlatformRequestContext {
  return {
    credentialId: "credential_1",
    credentialLabel: "Production",
    environmentId: `environment_${environmentType}`,
    environmentType,
    organizationId: "org_1",
    websiteId: "site_1",
  };
}

function category(slug: string, websiteId = "site_1") {
  return {
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    deletedAt: null,
    id: `category_${slug}`,
    name: slug.toUpperCase(),
    organizationId: websiteId === "site_1" ? "org_1" : "org_2",
    slug,
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    websiteId,
  };
}

function tag(slug: string, websiteId = "site_1") {
  return {
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    deletedAt: null,
    id: `tag_${slug}`,
    name: slug.toUpperCase(),
    organizationId: websiteId === "site_1" ? "org_1" : "org_2",
    slug,
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    websiteId,
  };
}

function post({
  categorySlug = "news",
  createdAt = "2026-07-01T00:00:00.000Z",
  deletedAt = null,
  featuredMedia = null,
  id,
  publishedAt,
  slug,
  status = "published",
  tagSlug = "featured",
  websiteId = "site_1",
}: {
  categorySlug?: string;
  createdAt?: string;
  deletedAt?: Date | null;
  featuredMedia?: Record<string, unknown> | null;
  id: string;
  publishedAt: string | null;
  slug: string;
  status?: "archived" | "draft" | "published";
  tagSlug?: string;
  websiteId?: string;
}) {
  return {
    authorUserId: null,
    canonicalUrl: null,
    categories: [{ category: category(categorySlug, websiteId) }],
    content: { format: "markdown", markdown: `# ${slug}` },
    createdAt: new Date(createdAt),
    deletedAt,
    excerpt: `${slug} excerpt`,
    featuredMedia,
    featuredMediaId: featuredMedia ? String(featuredMedia.id) : null,
    id,
    metaDescription: null,
    organizationId: websiteId === "site_1" ? "org_1" : "org_2",
    publishedAt: publishedAt ? new Date(publishedAt) : null,
    robotsFollow: true,
    robotsIndex: true,
    seoTitle: null,
    slug,
    status,
    tags: [{ tag: tag(tagSlug, websiteId) }],
    title: slug,
    updatedAt: new Date(createdAt),
    websiteId,
  };
}

function createDatabase({
  enabled = true,
  posts = [],
}: {
  enabled?: boolean;
  posts?: ReturnType<typeof post>[];
} = {}) {
  const categories = [category("news"), category("updates"), category("outside", "site_2")];
  const tags = [tag("featured"), tag("release"), tag("outside", "site_2")];
  const database = {
    query: {
      blogCategories: {
        findMany: () => Promise.resolve(categories.filter((item) => item.websiteId === "site_1")),
      },
      blogPosts: {
        findMany: () =>
          Promise.resolve(
            posts.filter(
              (item) =>
                item.organizationId === "org_1" && item.websiteId === "site_1" && !item.deletedAt,
            ),
          ),
      },
      blogTags: {
        findMany: () => Promise.resolve(tags.filter((item) => item.websiteId === "site_1")),
      },
      websiteModules: {
        findFirst: () => Promise.resolve(enabled ? { id: "module_1" } : null),
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
  };

  return database as never;
}

describe("Blog visibility policy", () => {
  it("only allows preview widening for staging principals", () => {
    expect(getBlogVisibilityPolicy(context("production"), true).statuses).toEqual(["published"]);
    expect(getBlogVisibilityPolicy(context("staging"), false).statuses).toEqual(["published"]);
    expect(getBlogVisibilityPolicy(context("staging"), true).statuses).toEqual([
      "draft",
      "published",
    ]);
  });
});

describe("Platform Blog post reads", () => {
  const rows = [
    post({
      createdAt: "2026-07-04T00:00:00.000Z",
      id: "published_2",
      publishedAt: "2026-07-12T00:00:00.000Z",
      slug: "published-newer",
      tagSlug: "release",
    }),
    post({
      featuredMedia: {
        altText: "Alt",
        deletedAt: null,
        id: "media_1",
        metadata: {
          height: 600,
          publicUrl: "https://cdn.example.com/image.jpg",
          secret: "hidden",
          width: 800,
        },
        mimeType: "image/jpeg",
      },
      id: "published_1",
      publishedAt: "2026-07-10T00:00:00.000Z",
      slug: "published",
    }),
    post({ id: "draft_1", publishedAt: null, slug: "draft", status: "draft" }),
    post({
      id: "archived_1",
      publishedAt: "2026-07-09T00:00:00.000Z",
      slug: "archived",
      status: "archived",
    }),
    post({
      deletedAt: new Date("2026-07-13T00:00:00.000Z"),
      id: "deleted_1",
      publishedAt: "2026-07-08T00:00:00.000Z",
      slug: "deleted",
    }),
    post({
      id: "other_site",
      publishedAt: "2026-07-13T00:00:00.000Z",
      slug: "other",
      websiteId: "site_2",
    }),
  ];

  it("rejects disabled Blog modules", async () => {
    await expect(
      listPlatformBlogPosts({ context: context(), database: createDatabase({ enabled: false }) }),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENABLED" });
  });

  it("lists published posts for production and excludes draft, archived, deleted, and cross-site posts", async () => {
    const result = await listPlatformBlogPosts({
      context: context("production"),
      database: createDatabase({ posts: rows }),
      options: { preview: true },
    });

    expect(result.items.map((item) => item.slug)).toEqual(["published-newer", "published"]);
    expect(JSON.stringify(result)).not.toContain("draft");
    expect(JSON.stringify(result)).not.toContain("hidden");
    expect(result.items[1]?.featuredMedia).toMatchObject({
      altText: "Alt",
      height: 600,
      mimeType: "image/jpeg",
      url: "https://cdn.example.com/image.jpg",
      width: 800,
    });
  });

  it("keeps staging default published-only and allows drafts with preview=true", async () => {
    const defaultResult = await listPlatformBlogPosts({
      context: context("staging"),
      database: createDatabase({ posts: rows }),
    });
    const previewResult = await listPlatformBlogPosts({
      context: context("staging"),
      database: createDatabase({ posts: rows }),
      options: { preview: true },
    });

    expect(defaultResult.items.map((item) => item.slug)).toEqual(["published-newer", "published"]);
    expect(previewResult.items.map((item) => item.slug)).toEqual([
      "published-newer",
      "published",
      "draft",
    ]);
    expect(previewResult.items.find((item) => item.slug === "draft")?.status).toBe("draft");
  });

  it("returns hidden slugs as NOT_FOUND", async () => {
    const database = createDatabase({ posts: rows });

    await expect(
      getPlatformBlogPostBySlug({
        context: context("production"),
        database,
        options: { preview: true },
        slug: "draft",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      getPlatformBlogPostBySlug({ context: context("staging"), database, slug: "draft" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      getPlatformBlogPostBySlug({
        context: context("staging"),
        database,
        options: { preview: true },
        slug: "draft",
      }),
    ).resolves.toMatchObject({ post: { slug: "draft" } });
    await expect(
      getPlatformBlogPostBySlug({
        context: context("staging"),
        database,
        options: { preview: true },
        slug: "archived",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      getPlatformBlogPostBySlug({ context: context("production"), database, slug: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("filters category and tag without leaking other websites", async () => {
    const database = createDatabase({ posts: rows });

    await expect(
      listPlatformBlogPosts({
        context: context(),
        database,
        options: { category: "news", tag: "release" },
      }),
    ).resolves.toMatchObject({ items: [{ slug: "published-newer" }] });
    await expect(
      listPlatformBlogPosts({
        context: context(),
        database,
        options: { category: "outside" },
      }),
    ).resolves.toMatchObject({ items: [] });
  });

  it("applies bounded pagination and validates invalid pages", async () => {
    await expect(
      listPlatformBlogPosts({
        context: context(),
        database: createDatabase({ posts: rows }),
        options: { limit: 1, page: 2 },
      }),
    ).resolves.toMatchObject({
      items: [{ slug: "published" }],
      pagination: { hasNextPage: false, hasPreviousPage: true, limit: 1, page: 2, total: 2 },
    });
    await expect(
      listPlatformBlogPosts({
        context: context(),
        database: createDatabase({ posts: rows }),
        options: { limit: 999 },
      }),
    ).rejects.toBeInstanceOf(PlatformApiError);
  });
});

describe("Platform Blog taxonomy reads", () => {
  it("lists website-owned categories and tags", async () => {
    const database = createDatabase();

    await expect(listPlatformBlogCategories({ context: context(), database })).resolves.toEqual({
      items: [
        { id: "category_news", name: "NEWS", slug: "news" },
        { id: "category_updates", name: "UPDATES", slug: "updates" },
      ],
    });
    await expect(listPlatformBlogTags({ context: context(), database })).resolves.toEqual({
      items: [
        { id: "tag_featured", name: "FEATURED", slug: "featured" },
        { id: "tag_release", name: "RELEASE", slug: "release" },
      ],
    });
  });
});
