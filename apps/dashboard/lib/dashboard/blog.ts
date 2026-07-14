import { and, asc, count, desc, eq, ilike, inArray, isNull, ne } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import {
  auditLogs,
  blogCategories,
  blogPostCategories,
  blogPosts,
  blogPostTags,
  blogTags,
  mediaAssets,
  users,
  websiteModules,
} from "@agency/database/schema";
import type { BlogContentDocument } from "@agency/database/schema";
import type { Permission } from "@agency/auth";
import { getPagination } from "./filters";
import { requireWebsiteAccess } from "./projects";
import type { DashboardRequest, DashboardSearchParams } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;
type BlogPermission = Extract<
  Permission,
  "blog:create" | "blog:delete" | "blog:publish" | "blog:read" | "blog:update"
>;

export type BlogPostStatus = "archived" | "draft" | "published";

export interface BlogPostInput {
  canonicalUrl?: string | null;
  categoryIds?: string[];
  content?: string | null;
  excerpt?: string | null;
  featuredMediaId?: string | null;
  metaDescription?: string | null;
  robotsFollow?: boolean;
  robotsIndex?: boolean;
  seoTitle?: string | null;
  slug?: string | null;
  tagIds?: string[];
  title: string;
}

export class BlogDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlogDomainError";
  }
}

export function normalizeBlogSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function requireNonEmptySlug(value: string): string {
  const slug = normalizeBlogSlug(value);

  if (!slug) {
    throw new BlogDomainError("Blog slug is required.");
  }

  return slug;
}

function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeContent(markdown: string | null | undefined): BlogContentDocument {
  return {
    format: "markdown",
    markdown: markdown?.trim() ?? "",
  };
}

function safeMetadata(input: {
  slug?: string;
  status?: string;
  title?: string;
  websiteId: string;
}) {
  return {
    slug: input.slug,
    status: input.status,
    title: input.title?.slice(0, 120),
    websiteId: input.websiteId,
  };
}

async function writeBlogAudit({
  action,
  database,
  metadata,
  organizationId,
  request,
  resourceId,
  resourceType,
}: {
  action:
    | "blog_category.created"
    | "blog_category.deleted"
    | "blog_category.updated"
    | "blog_post.archived"
    | "blog_post.created"
    | "blog_post.deleted"
    | "blog_post.published"
    | "blog_post.unpublished"
    | "blog_post.updated"
    | "blog_tag.created"
    | "blog_tag.deleted"
    | "blog_tag.updated";
  database: Database;
  metadata: Record<string, unknown>;
  organizationId: string;
  request: DashboardRequest;
  resourceId: string;
  resourceType: "blog_category" | "blog_post" | "blog_tag";
}) {
  await database.insert(auditLogs).values({
    action,
    actorUserId: request.context.user.id,
    metadata,
    organizationId,
    resourceId,
    resourceType,
  });
}

async function requireBlogWebsite({
  database,
  permission,
  request,
  websiteId,
}: {
  database: Database;
  permission: BlogPermission;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, permission, request, websiteId });

  if (website.websiteType !== "sharoz_connected") {
    throw new BlogDomainError("Blog is only available for Sharoz Connected websites.");
  }

  const enabled = await database.query.websiteModules.findFirst({
    where: and(
      eq(websiteModules.organizationId, website.organizationId),
      eq(websiteModules.websiteId, website.id),
      eq(websiteModules.moduleKey, "blog"),
      eq(websiteModules.enabled, true),
    ),
    columns: { id: true },
  });

  if (!enabled) {
    throw new BlogDomainError("Blog module is not enabled for this website.");
  }

  return website;
}

async function assertUniquePostSlug({
  database,
  excludePostId,
  slug,
  websiteId,
}: {
  database: Database;
  excludePostId?: string;
  slug: string;
  websiteId: string;
}) {
  const existing = await database.query.blogPosts.findFirst({
    where: and(
      eq(blogPosts.websiteId, websiteId),
      eq(blogPosts.slug, slug),
      isNull(blogPosts.deletedAt),
      excludePostId ? ne(blogPosts.id, excludePostId) : undefined,
    ),
    columns: { id: true },
  });

  if (existing) {
    throw new BlogDomainError("A Blog post with this slug already exists for this website.");
  }
}

async function assertUniqueCategorySlug({
  database,
  excludeCategoryId,
  slug,
  websiteId,
}: {
  database: Database;
  excludeCategoryId?: string;
  slug: string;
  websiteId: string;
}) {
  const existing = await database.query.blogCategories.findFirst({
    where: and(
      eq(blogCategories.websiteId, websiteId),
      eq(blogCategories.slug, slug),
      isNull(blogCategories.deletedAt),
      excludeCategoryId ? ne(blogCategories.id, excludeCategoryId) : undefined,
    ),
    columns: { id: true },
  });

  if (existing) {
    throw new BlogDomainError("A Blog category with this slug already exists for this website.");
  }
}

async function assertUniqueTagSlug({
  database,
  excludeTagId,
  slug,
  websiteId,
}: {
  database: Database;
  excludeTagId?: string;
  slug: string;
  websiteId: string;
}) {
  const existing = await database.query.blogTags.findFirst({
    where: and(
      eq(blogTags.websiteId, websiteId),
      eq(blogTags.slug, slug),
      isNull(blogTags.deletedAt),
      excludeTagId ? ne(blogTags.id, excludeTagId) : undefined,
    ),
    columns: { id: true },
  });

  if (existing) {
    throw new BlogDomainError("A Blog tag with this slug already exists for this website.");
  }
}

async function validateFeaturedMedia({
  database,
  featuredMediaId,
  organizationId,
  websiteId,
}: {
  database: Database;
  featuredMediaId?: string | null;
  organizationId: string;
  websiteId: string;
}) {
  if (!featuredMediaId) {
    return null;
  }

  const media = await database.query.mediaAssets.findFirst({
    where: and(
      eq(mediaAssets.id, featuredMediaId),
      eq(mediaAssets.organizationId, organizationId),
      eq(mediaAssets.websiteId, websiteId),
      isNull(mediaAssets.deletedAt),
    ),
    columns: { id: true },
  });

  if (!media) {
    throw new BlogDomainError("Featured media must belong to this website.");
  }

  return media.id;
}

async function validateCategoryIds({
  categoryIds = [],
  database,
  organizationId,
  websiteId,
}: {
  categoryIds?: string[];
  database: Database;
  organizationId: string;
  websiteId: string;
}) {
  const ids = Array.from(new Set(categoryIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const rows = await database.query.blogCategories.findMany({
    where: and(
      inArray(blogCategories.id, ids),
      eq(blogCategories.organizationId, organizationId),
      eq(blogCategories.websiteId, websiteId),
      isNull(blogCategories.deletedAt),
    ),
    columns: { id: true },
  });

  if (rows.length !== ids.length) {
    throw new BlogDomainError("Blog categories must belong to this website.");
  }

  return ids;
}

async function validateTagIds({
  database,
  organizationId,
  tagIds = [],
  websiteId,
}: {
  database: Database;
  organizationId: string;
  tagIds?: string[];
  websiteId: string;
}) {
  const ids = Array.from(new Set(tagIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const rows = await database.query.blogTags.findMany({
    where: and(
      inArray(blogTags.id, ids),
      eq(blogTags.organizationId, organizationId),
      eq(blogTags.websiteId, websiteId),
      isNull(blogTags.deletedAt),
    ),
    columns: { id: true },
  });

  if (rows.length !== ids.length) {
    throw new BlogDomainError("Blog tags must belong to this website.");
  }

  return ids;
}

async function replacePostTaxonomy({
  categoryIds,
  database,
  organizationId,
  postId,
  tagIds,
  websiteId,
}: {
  categoryIds: string[];
  database: Database;
  organizationId: string;
  postId: string;
  tagIds: string[];
  websiteId: string;
}) {
  await database.delete(blogPostCategories).where(eq(blogPostCategories.postId, postId));
  await database.delete(blogPostTags).where(eq(blogPostTags.postId, postId));

  if (categoryIds.length > 0) {
    await database.insert(blogPostCategories).values(
      categoryIds.map((categoryId) => ({
        categoryId,
        organizationId,
        postId,
        websiteId,
      })),
    );
  }

  if (tagIds.length > 0) {
    await database.insert(blogPostTags).values(
      tagIds.map((tagId) => ({
        organizationId,
        postId,
        tagId,
        websiteId,
      })),
    );
  }
}

function normalizePostInput(input: BlogPostInput) {
  const title = input.title.trim();
  if (title.length < 2) {
    throw new BlogDomainError("Blog post title must be at least 2 characters.");
  }

  const slug = requireNonEmptySlug(input.slug ?? title);
  const canonicalUrl = normalizeOptionalText(input.canonicalUrl, 500);
  if (canonicalUrl) {
    try {
      const parsed = new URL(canonicalUrl);
      if (parsed.protocol !== "https:") {
        throw new BlogDomainError("Canonical URL must use HTTPS.");
      }
    } catch (error) {
      if (error instanceof BlogDomainError) throw error;
      throw new BlogDomainError("Canonical URL must be a valid URL.");
    }
  }

  return {
    canonicalUrl,
    content: normalizeContent(input.content),
    excerpt: input.excerpt?.trim().slice(0, 500) ?? "",
    metaDescription: normalizeOptionalText(input.metaDescription, 160),
    robotsFollow: input.robotsFollow ?? true,
    robotsIndex: input.robotsIndex ?? true,
    seoTitle: normalizeOptionalText(input.seoTitle, 70),
    slug,
    title,
  };
}

export async function listBlogPosts({
  database,
  params,
  request,
  websiteId,
}: {
  database: Database;
  params: DashboardSearchParams & { status?: BlogPostStatus | "all" };
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireBlogWebsite({
    database,
    permission: "blog:read",
    request,
    websiteId,
  });
  const { limit, offset } = getPagination(params);

  const rows = await database
    .select({
      authorName: users.name,
      id: blogPosts.id,
      publishedAt: blogPosts.publishedAt,
      slug: blogPosts.slug,
      status: blogPosts.status,
      title: blogPosts.title,
      updatedAt: blogPosts.updatedAt,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorUserId, users.id))
    .where(
      and(
        eq(blogPosts.organizationId, website.organizationId),
        eq(blogPosts.websiteId, website.id),
        isNull(blogPosts.deletedAt),
        params.status !== "all" ? eq(blogPosts.status, params.status) : undefined,
        params.query ? ilike(blogPosts.title, `%${params.query}%`) : undefined,
      ),
    )
    .orderBy(
      params.sort === "published_asc" ? asc(blogPosts.publishedAt) : desc(blogPosts.updatedAt),
    )
    .limit(limit)
    .offset(offset);

  return { items: rows, page: params.page };
}

export async function requireBlogPostAccess({
  database,
  permission,
  postId,
  request,
}: {
  database: Database;
  permission: BlogPermission;
  postId: string;
  request: DashboardRequest;
}) {
  const post = await database.query.blogPosts.findFirst({
    where: and(eq(blogPosts.id, postId), isNull(blogPosts.deletedAt)),
    with: {
      author: { columns: { id: true, name: true } },
      categories: { with: { category: true } },
      featuredMedia: true,
      tags: { with: { tag: true } },
      website: true,
    },
  });

  if (!post) {
    throw new BlogDomainError("Blog post was not found.");
  }

  await requireBlogWebsite({ database, permission, request, websiteId: post.websiteId });
  return post;
}

export async function createBlogPost({
  database,
  input,
  request,
  websiteId,
}: {
  database: Database;
  input: BlogPostInput;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireBlogWebsite({
    database,
    permission: "blog:create",
    request,
    websiteId,
  });
  const normalized = normalizePostInput(input);
  await assertUniquePostSlug({ database, slug: normalized.slug, websiteId: website.id });
  const featuredMediaId = await validateFeaturedMedia({
    database,
    featuredMediaId: input.featuredMediaId ?? null,
    organizationId: website.organizationId,
    websiteId: website.id,
  });
  const categoryIds = await validateCategoryIds({
    categoryIds: input.categoryIds ?? [],
    database,
    organizationId: website.organizationId,
    websiteId: website.id,
  });
  const tagIds = await validateTagIds({
    database,
    organizationId: website.organizationId,
    tagIds: input.tagIds ?? [],
    websiteId: website.id,
  });

  const [post] = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(blogPosts)
      .values({
        ...normalized,
        authorUserId: request.context.user.id,
        featuredMediaId,
        organizationId: website.organizationId,
        status: "draft",
        websiteId: website.id,
      })
      .returning();

    if (!created) {
      throw new BlogDomainError("Blog post could not be created.");
    }

    await replacePostTaxonomy({
      categoryIds,
      database: tx as unknown as Database,
      organizationId: website.organizationId,
      postId: created.id,
      tagIds,
      websiteId: website.id,
    });
    await writeBlogAudit({
      action: "blog_post.created",
      database: tx as unknown as Database,
      metadata: safeMetadata({
        slug: created.slug,
        status: created.status,
        title: created.title,
        websiteId: website.id,
      }),
      organizationId: website.organizationId,
      request,
      resourceId: created.id,
      resourceType: "blog_post",
    });

    return [created];
  });

  return post;
}

export async function updateBlogPost({
  database,
  input,
  postId,
  request,
}: {
  database: Database;
  input: BlogPostInput;
  postId: string;
  request: DashboardRequest;
}) {
  const existing = await requireBlogPostAccess({
    database,
    permission: "blog:update",
    postId,
    request,
  });
  const normalized = normalizePostInput(input);
  await assertUniquePostSlug({
    database,
    excludePostId: existing.id,
    slug: normalized.slug,
    websiteId: existing.websiteId,
  });
  const featuredMediaId = await validateFeaturedMedia({
    database,
    featuredMediaId: input.featuredMediaId ?? null,
    organizationId: existing.organizationId,
    websiteId: existing.websiteId,
  });
  const categoryIds = await validateCategoryIds({
    categoryIds: input.categoryIds ?? [],
    database,
    organizationId: existing.organizationId,
    websiteId: existing.websiteId,
  });
  const tagIds = await validateTagIds({
    database,
    organizationId: existing.organizationId,
    tagIds: input.tagIds ?? [],
    websiteId: existing.websiteId,
  });
  const now = new Date();

  const [post] = await database.transaction(async (tx) => {
    const [updated] = await tx
      .update(blogPosts)
      .set({
        ...normalized,
        featuredMediaId,
        updatedAt: now,
      })
      .where(eq(blogPosts.id, existing.id))
      .returning();

    if (!updated) {
      throw new BlogDomainError("Blog post could not be updated.");
    }

    await replacePostTaxonomy({
      categoryIds,
      database: tx as unknown as Database,
      organizationId: existing.organizationId,
      postId: existing.id,
      tagIds,
      websiteId: existing.websiteId,
    });
    await writeBlogAudit({
      action: "blog_post.updated",
      database: tx as unknown as Database,
      metadata: safeMetadata({
        slug: updated.slug,
        status: updated.status,
        title: updated.title,
        websiteId: existing.websiteId,
      }),
      organizationId: existing.organizationId,
      request,
      resourceId: existing.id,
      resourceType: "blog_post",
    });

    return [updated];
  });

  return post;
}

export async function publishBlogPost({
  database,
  postId,
  request,
}: {
  database: Database;
  postId: string;
  request: DashboardRequest;
}) {
  const post = await requireBlogPostAccess({
    database,
    permission: "blog:publish",
    postId,
    request,
  });
  const now = new Date();
  const [updated] = await database
    .update(blogPosts)
    .set({
      publishedAt: post.publishedAt ?? now,
      status: "published",
      updatedAt: now,
    })
    .where(eq(blogPosts.id, post.id))
    .returning();

  if (!updated) throw new BlogDomainError("Blog post could not be published.");

  await writeBlogAudit({
    action: "blog_post.published",
    database,
    metadata: safeMetadata({
      slug: updated.slug,
      status: updated.status,
      title: updated.title,
      websiteId: updated.websiteId,
    }),
    organizationId: updated.organizationId,
    request,
    resourceId: updated.id,
    resourceType: "blog_post",
  });

  return updated;
}

export async function unpublishBlogPost({
  database,
  postId,
  request,
}: {
  database: Database;
  postId: string;
  request: DashboardRequest;
}) {
  const post = await requireBlogPostAccess({
    database,
    permission: "blog:publish",
    postId,
    request,
  });
  const now = new Date();
  const [updated] = await database
    .update(blogPosts)
    .set({
      publishedAt: null,
      status: "draft",
      updatedAt: now,
    })
    .where(eq(blogPosts.id, post.id))
    .returning();

  if (!updated) throw new BlogDomainError("Blog post could not be unpublished.");

  await writeBlogAudit({
    action: "blog_post.unpublished",
    database,
    metadata: safeMetadata({
      slug: updated.slug,
      status: updated.status,
      title: updated.title,
      websiteId: updated.websiteId,
    }),
    organizationId: updated.organizationId,
    request,
    resourceId: updated.id,
    resourceType: "blog_post",
  });

  return updated;
}

export async function archiveBlogPost({
  database,
  postId,
  request,
}: {
  database: Database;
  postId: string;
  request: DashboardRequest;
}) {
  const post = await requireBlogPostAccess({
    database,
    permission: "blog:update",
    postId,
    request,
  });
  const now = new Date();
  const [updated] = await database
    .update(blogPosts)
    .set({ status: "archived", updatedAt: now })
    .where(eq(blogPosts.id, post.id))
    .returning();

  if (!updated) throw new BlogDomainError("Blog post could not be archived.");

  await writeBlogAudit({
    action: "blog_post.archived",
    database,
    metadata: safeMetadata({
      slug: updated.slug,
      status: updated.status,
      title: updated.title,
      websiteId: updated.websiteId,
    }),
    organizationId: updated.organizationId,
    request,
    resourceId: updated.id,
    resourceType: "blog_post",
  });

  return updated;
}

export async function deleteBlogPost({
  database,
  postId,
  request,
}: {
  database: Database;
  postId: string;
  request: DashboardRequest;
}) {
  const post = await requireBlogPostAccess({
    database,
    permission: "blog:delete",
    postId,
    request,
  });
  const now = new Date();
  const [updated] = await database
    .update(blogPosts)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(blogPosts.id, post.id))
    .returning();

  if (!updated) throw new BlogDomainError("Blog post could not be deleted.");

  await writeBlogAudit({
    action: "blog_post.deleted",
    database,
    metadata: safeMetadata({
      slug: updated.slug,
      status: updated.status,
      title: updated.title,
      websiteId: updated.websiteId,
    }),
    organizationId: updated.organizationId,
    request,
    resourceId: updated.id,
    resourceType: "blog_post",
  });

  return updated;
}

export async function listBlogCategories({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireBlogWebsite({
    database,
    permission: "blog:read",
    request,
    websiteId,
  });

  return database.query.blogCategories.findMany({
    where: and(
      eq(blogCategories.organizationId, website.organizationId),
      eq(blogCategories.websiteId, website.id),
      isNull(blogCategories.deletedAt),
    ),
    orderBy: asc(blogCategories.name),
  });
}

export async function createBlogCategory({
  database,
  name,
  request,
  slug,
  websiteId,
}: {
  database: Database;
  name: string;
  request: DashboardRequest;
  slug?: string | null;
  websiteId: string;
}) {
  const website = await requireBlogWebsite({
    database,
    permission: "blog:update",
    request,
    websiteId,
  });
  const normalizedName = name.trim();
  if (normalizedName.length < 2) throw new BlogDomainError("Blog category name is required.");
  const normalizedSlug = requireNonEmptySlug(slug ?? normalizedName);
  await assertUniqueCategorySlug({ database, slug: normalizedSlug, websiteId: website.id });

  const [category] = await database
    .insert(blogCategories)
    .values({
      name: normalizedName,
      organizationId: website.organizationId,
      slug: normalizedSlug,
      websiteId: website.id,
    })
    .returning();

  if (!category) throw new BlogDomainError("Blog category could not be created.");

  await writeBlogAudit({
    action: "blog_category.created",
    database,
    metadata: safeMetadata({
      slug: category.slug,
      title: category.name,
      websiteId: website.id,
    }),
    organizationId: website.organizationId,
    request,
    resourceId: category.id,
    resourceType: "blog_category",
  });

  return category;
}

export async function updateBlogCategory({
  categoryId,
  database,
  name,
  request,
  slug,
}: {
  categoryId: string;
  database: Database;
  name: string;
  request: DashboardRequest;
  slug?: string | null;
}) {
  const category = await database.query.blogCategories.findFirst({
    where: and(eq(blogCategories.id, categoryId), isNull(blogCategories.deletedAt)),
  });
  if (!category) throw new BlogDomainError("Blog category was not found.");
  await requireBlogWebsite({
    database,
    permission: "blog:update",
    request,
    websiteId: category.websiteId,
  });
  const normalizedName = name.trim();
  if (normalizedName.length < 2) throw new BlogDomainError("Blog category name is required.");
  const normalizedSlug = requireNonEmptySlug(slug ?? normalizedName);
  await assertUniqueCategorySlug({
    database,
    excludeCategoryId: category.id,
    slug: normalizedSlug,
    websiteId: category.websiteId,
  });

  const [updated] = await database
    .update(blogCategories)
    .set({ name: normalizedName, slug: normalizedSlug, updatedAt: new Date() })
    .where(eq(blogCategories.id, category.id))
    .returning();

  if (!updated) throw new BlogDomainError("Blog category could not be updated.");

  await writeBlogAudit({
    action: "blog_category.updated",
    database,
    metadata: safeMetadata({
      slug: updated.slug,
      title: updated.name,
      websiteId: updated.websiteId,
    }),
    organizationId: updated.organizationId,
    request,
    resourceId: updated.id,
    resourceType: "blog_category",
  });

  return updated;
}

export async function deleteBlogCategory({
  categoryId,
  database,
  request,
}: {
  categoryId: string;
  database: Database;
  request: DashboardRequest;
}) {
  const category = await database.query.blogCategories.findFirst({
    where: and(eq(blogCategories.id, categoryId), isNull(blogCategories.deletedAt)),
  });
  if (!category) throw new BlogDomainError("Blog category was not found.");
  await requireBlogWebsite({
    database,
    permission: "blog:update",
    request,
    websiteId: category.websiteId,
  });
  const [{ value } = { value: 0 }] = await database
    .select({ value: count() })
    .from(blogPostCategories)
    .where(eq(blogPostCategories.categoryId, category.id));
  if (value > 0) {
    throw new BlogDomainError("Assigned Blog categories cannot be deleted.");
  }

  const now = new Date();
  const [updated] = await database
    .update(blogCategories)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(blogCategories.id, category.id))
    .returning();
  if (!updated) throw new BlogDomainError("Blog category could not be deleted.");

  await writeBlogAudit({
    action: "blog_category.deleted",
    database,
    metadata: safeMetadata({
      slug: updated.slug,
      title: updated.name,
      websiteId: updated.websiteId,
    }),
    organizationId: updated.organizationId,
    request,
    resourceId: updated.id,
    resourceType: "blog_category",
  });

  return updated;
}

export async function listBlogTags({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireBlogWebsite({
    database,
    permission: "blog:read",
    request,
    websiteId,
  });

  return database.query.blogTags.findMany({
    where: and(
      eq(blogTags.organizationId, website.organizationId),
      eq(blogTags.websiteId, website.id),
      isNull(blogTags.deletedAt),
    ),
    orderBy: asc(blogTags.name),
  });
}

export async function createBlogTag({
  database,
  name,
  request,
  slug,
  websiteId,
}: {
  database: Database;
  name: string;
  request: DashboardRequest;
  slug?: string | null;
  websiteId: string;
}) {
  const website = await requireBlogWebsite({
    database,
    permission: "blog:update",
    request,
    websiteId,
  });
  const normalizedName = name.trim();
  if (normalizedName.length < 2) throw new BlogDomainError("Blog tag name is required.");
  const normalizedSlug = requireNonEmptySlug(slug ?? normalizedName);
  await assertUniqueTagSlug({ database, slug: normalizedSlug, websiteId: website.id });

  const [tag] = await database
    .insert(blogTags)
    .values({
      name: normalizedName,
      organizationId: website.organizationId,
      slug: normalizedSlug,
      websiteId: website.id,
    })
    .returning();

  if (!tag) throw new BlogDomainError("Blog tag could not be created.");

  await writeBlogAudit({
    action: "blog_tag.created",
    database,
    metadata: safeMetadata({ slug: tag.slug, title: tag.name, websiteId: website.id }),
    organizationId: website.organizationId,
    request,
    resourceId: tag.id,
    resourceType: "blog_tag",
  });

  return tag;
}

export async function updateBlogTag({
  database,
  name,
  request,
  slug,
  tagId,
}: {
  database: Database;
  name: string;
  request: DashboardRequest;
  slug?: string | null;
  tagId: string;
}) {
  const tag = await database.query.blogTags.findFirst({
    where: and(eq(blogTags.id, tagId), isNull(blogTags.deletedAt)),
  });
  if (!tag) throw new BlogDomainError("Blog tag was not found.");
  await requireBlogWebsite({
    database,
    permission: "blog:update",
    request,
    websiteId: tag.websiteId,
  });
  const normalizedName = name.trim();
  if (normalizedName.length < 2) throw new BlogDomainError("Blog tag name is required.");
  const normalizedSlug = requireNonEmptySlug(slug ?? normalizedName);
  await assertUniqueTagSlug({
    database,
    excludeTagId: tag.id,
    slug: normalizedSlug,
    websiteId: tag.websiteId,
  });

  const [updated] = await database
    .update(blogTags)
    .set({ name: normalizedName, slug: normalizedSlug, updatedAt: new Date() })
    .where(eq(blogTags.id, tag.id))
    .returning();

  if (!updated) throw new BlogDomainError("Blog tag could not be updated.");

  await writeBlogAudit({
    action: "blog_tag.updated",
    database,
    metadata: safeMetadata({
      slug: updated.slug,
      title: updated.name,
      websiteId: updated.websiteId,
    }),
    organizationId: updated.organizationId,
    request,
    resourceId: updated.id,
    resourceType: "blog_tag",
  });

  return updated;
}

export async function deleteBlogTag({
  database,
  request,
  tagId,
}: {
  database: Database;
  request: DashboardRequest;
  tagId: string;
}) {
  const tag = await database.query.blogTags.findFirst({
    where: and(eq(blogTags.id, tagId), isNull(blogTags.deletedAt)),
  });
  if (!tag) throw new BlogDomainError("Blog tag was not found.");
  await requireBlogWebsite({
    database,
    permission: "blog:update",
    request,
    websiteId: tag.websiteId,
  });
  const [{ value } = { value: 0 }] = await database
    .select({ value: count() })
    .from(blogPostTags)
    .where(eq(blogPostTags.tagId, tag.id));
  if (value > 0) {
    throw new BlogDomainError("Assigned Blog tags cannot be deleted.");
  }

  const now = new Date();
  const [updated] = await database
    .update(blogTags)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(blogTags.id, tag.id))
    .returning();
  if (!updated) throw new BlogDomainError("Blog tag could not be deleted.");

  await writeBlogAudit({
    action: "blog_tag.deleted",
    database,
    metadata: safeMetadata({
      slug: updated.slug,
      title: updated.name,
      websiteId: updated.websiteId,
    }),
    organizationId: updated.organizationId,
    request,
    resourceId: updated.id,
    resourceType: "blog_tag",
  });

  return updated;
}
