import { and, eq, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import type {
  BlogCategory,
  BlogCategoryListResponse,
  BlogFeaturedMedia,
  BlogPost,
  BlogPostListResponse,
  BlogPostResponse,
  BlogPostSummary,
  BlogTag,
  BlogTagListResponse,
} from "@sharoz/contracts";
import type { createDatabaseClient } from "@agency/database";
import {
  blogCategories,
  blogPostCategories,
  blogPosts,
  blogPostTags,
  blogTags,
} from "@agency/database/schema";
import { requireEnabledModule } from "./modules";
import type { PlatformRequestContext } from "./auth";
import { PlatformApiError } from "./errors";
import { resolvePublicMediaDimensions, resolvePublicMediaUrl } from "./media";

type Database = ReturnType<typeof createDatabaseClient>;

const defaultPage = 1;
const defaultLimit = 10;
const maxLimit = 50;

interface PlatformBlogCategoryRow {
  deletedAt: Date | null;
  id: string;
  name: string;
  slug: string;
}

interface PlatformBlogTagRow {
  deletedAt: Date | null;
  id: string;
  name: string;
  slug: string;
}

interface PlatformBlogMediaRow {
  altText: string | null;
  deletedAt: Date | null;
  id: string;
  metadata: Record<string, unknown>;
  mimeType: string;
}

interface PlatformBlogPostRow {
  canonicalUrl: string | null;
  categories: { category: PlatformBlogCategoryRow | null }[];
  content: { format: "markdown"; markdown: string };
  createdAt: Date;
  deletedAt: Date | null;
  excerpt: string;
  featuredMedia: PlatformBlogMediaRow | null;
  id: string;
  metaDescription: string | null;
  publishedAt: Date | null;
  robotsFollow: boolean;
  robotsIndex: boolean;
  seoTitle: string | null;
  slug: string;
  status: "archived" | "draft" | "published";
  tags: { tag: PlatformBlogTagRow | null }[];
  title: string;
}

export interface BlogListOptions {
  category?: string | null;
  limit?: number | null;
  page?: number | null;
  preview?: boolean;
  tag?: string | null;
}

export interface BlogPostOptions {
  preview?: boolean;
}

export function getBlogVisibilityPolicy(
  context: Pick<PlatformRequestContext, "environmentType">,
  preview?: boolean,
) {
  const includeDrafts = context.environmentType === "staging" && preview === true;

  return {
    includeDrafts,
    statuses: includeDrafts ? (["draft", "published"] as const) : (["published"] as const),
  };
}

function publishedVisibilityFilter(now = new Date()) {
  return and(
    eq(blogPosts.status, "published"),
    isNotNull(blogPosts.publishedAt),
    lte(blogPosts.publishedAt, now),
  );
}

function isPublishedRow(row: PlatformBlogPostRow, now = new Date()) {
  return row.status === "published" && row.publishedAt !== null && row.publishedAt <= now;
}

function isVisibleRow({
  now = new Date(),
  policy,
  row,
}: {
  now?: Date;
  policy: ReturnType<typeof getBlogVisibilityPolicy>;
  row: PlatformBlogPostRow;
}) {
  if (row.deletedAt || row.status === "archived") {
    return false;
  }

  return isPublishedRow(row, now) || (policy.includeDrafts && row.status === "draft");
}

function normalizePositiveInteger({
  fallback,
  max,
  min = 1,
  name,
  value,
}: {
  fallback: number;
  max?: number;
  min?: number;
  name: string;
  value?: number | null | undefined;
}) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < min || (max !== undefined && value > max)) {
    throw new PlatformApiError({
      code: "INVALID_REQUEST",
      message:
        max === undefined
          ? `${name} must be an integer greater than or equal to ${String(min)}.`
          : `${name} must be an integer between ${String(min)} and ${String(max)}.`,
    });
  }

  return value;
}

function normalizeSlugFilter(value?: string | null) {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }

  return null;
}

function dateToIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toFeaturedMedia(
  media: PlatformBlogPostRow["featuredMedia"] | null | undefined,
): BlogFeaturedMedia | null {
  if (!media || media.deletedAt) {
    return null;
  }

  const dimensions = resolvePublicMediaDimensions(media);

  return {
    altText: media.altText,
    height: dimensions.height,
    id: media.id,
    mimeType: media.mimeType,
    url: resolvePublicMediaUrl(media),
    width: dimensions.width,
  };
}

function toCategory(
  row: PlatformBlogPostRow["categories"][number]["category"],
): BlogCategory | null {
  if (!row || row.deletedAt) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

function toTag(row: PlatformBlogPostRow["tags"][number]["tag"]): BlogTag | null {
  if (!row || row.deletedAt) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

function includeStatus(
  row: Pick<PlatformBlogPostRow, "status">,
  context: Pick<PlatformRequestContext, "environmentType">,
  preview?: boolean,
) {
  if (context.environmentType !== "staging" || preview !== true || row.status === "archived") {
    return undefined;
  }

  return row.status;
}

function toPostSummary({
  context,
  preview,
  row,
}: {
  context: PlatformRequestContext;
  preview?: boolean | undefined;
  row: PlatformBlogPostRow;
}): BlogPostSummary {
  return {
    categories: row.categories.flatMap((item) => {
      const category = toCategory(item.category);
      return category ? [category] : [];
    }),
    excerpt: row.excerpt,
    featuredMedia: toFeaturedMedia(row.featuredMedia),
    id: row.id,
    publishedAt: dateToIso(row.publishedAt),
    slug: row.slug,
    status: includeStatus(row, context, preview),
    tags: row.tags.flatMap((item) => {
      const tag = toTag(item.tag);
      return tag ? [tag] : [];
    }),
    title: row.title,
  };
}

function toPost({
  context,
  preview,
  row,
}: {
  context: PlatformRequestContext;
  preview?: boolean | undefined;
  row: PlatformBlogPostRow;
}): BlogPost {
  return {
    ...toPostSummary({ context, preview, row }),
    content: row.content,
    seo: {
      canonicalUrl: row.canonicalUrl,
      metaDescription: row.metaDescription,
      metaTitle: row.seoTitle,
      robots: {
        follow: row.robotsFollow,
        index: row.robotsIndex,
      },
    },
  };
}

function comparePosts(a: PlatformBlogPostRow, b: PlatformBlogPostRow) {
  const publishedDiff = (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  if (publishedDiff !== 0) {
    return publishedDiff;
  }

  const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return b.id.localeCompare(a.id);
}

function matchesTaxonomy(row: PlatformBlogPostRow, category?: string | null, tag?: string | null) {
  const categoryMatches = category
    ? row.categories.some((item) => item.category?.slug === category && !item.category.deletedAt)
    : true;
  const tagMatches = tag
    ? row.tags.some((item) => item.tag?.slug === tag && !item.tag.deletedAt)
    : true;

  return categoryMatches && tagMatches;
}

async function getVisibleBlogPosts({
  category,
  context,
  database,
  preview,
  tag,
}: {
  category?: string | null;
  context: PlatformRequestContext;
  database: Database;
  preview?: boolean | undefined;
  tag?: string | null;
}) {
  await requireEnabledModule({ context, database, moduleKey: "blog" });
  const policy = getBlogVisibilityPolicy(context, preview);
  const now = new Date();
  const visibilityFilter = policy.includeDrafts
    ? or(eq(blogPosts.status, "draft"), publishedVisibilityFilter())
    : publishedVisibilityFilter();

  const categoryFilter = category
    ? sql<boolean>`exists (
        select 1
        from ${blogPostCategories}
        inner join ${blogCategories}
          on ${blogCategories.id} = ${blogPostCategories.categoryId}
          and ${blogCategories.organizationId} = ${blogPostCategories.organizationId}
          and ${blogCategories.websiteId} = ${blogPostCategories.websiteId}
        where ${blogPostCategories.postId} = ${blogPosts.id}
          and ${blogPostCategories.organizationId} = ${context.organizationId}
          and ${blogPostCategories.websiteId} = ${context.websiteId}
          and ${blogCategories.slug} = ${category}
          and ${blogCategories.deletedAt} is null
      )`
    : undefined;
  const tagFilter = tag
    ? sql<boolean>`exists (
        select 1
        from ${blogPostTags}
        inner join ${blogTags}
          on ${blogTags.id} = ${blogPostTags.tagId}
          and ${blogTags.organizationId} = ${blogPostTags.organizationId}
          and ${blogTags.websiteId} = ${blogPostTags.websiteId}
        where ${blogPostTags.postId} = ${blogPosts.id}
          and ${blogPostTags.organizationId} = ${context.organizationId}
          and ${blogPostTags.websiteId} = ${context.websiteId}
          and ${blogTags.slug} = ${tag}
          and ${blogTags.deletedAt} is null
      )`
    : undefined;

  const rows = (await database.query.blogPosts.findMany({
    where: and(
      eq(blogPosts.organizationId, context.organizationId),
      eq(blogPosts.websiteId, context.websiteId),
      isNull(blogPosts.deletedAt),
      visibilityFilter,
      categoryFilter,
      tagFilter,
    ),
    with: {
      categories: { with: { category: true } },
      featuredMedia: true,
      tags: { with: { tag: true } },
    },
  })) as PlatformBlogPostRow[];

  return rows.filter((row) => isVisibleRow({ now, policy, row }));
}

export async function listPlatformBlogPosts({
  context,
  database,
  options = {},
}: {
  context: PlatformRequestContext;
  database: Database;
  options?: BlogListOptions;
}): Promise<BlogPostListResponse> {
  const page = normalizePositiveInteger({
    fallback: defaultPage,
    name: "page",
    value: options.page,
  });
  const limit = normalizePositiveInteger({
    fallback: defaultLimit,
    max: maxLimit,
    name: "limit",
    value: options.limit,
  });
  const category = normalizeSlugFilter(options.category);
  const tag = normalizeSlugFilter(options.tag);

  const rows = (
    await getVisibleBlogPosts({
      category,
      context,
      database,
      preview: options.preview,
      tag,
    })
  )
    .filter((row) => row.status !== "archived")
    .filter((row) => matchesTaxonomy(row, category, tag))
    .sort(comparePosts);

  const offset = (page - 1) * limit;
  const items = rows.slice(offset, offset + limit);
  const totalPages = Math.ceil(rows.length / limit);

  return {
    items: items.map((row) => toPostSummary({ context, preview: options.preview, row })),
    pagination: {
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      limit,
      page,
      total: rows.length,
      totalPages,
    },
  };
}

export async function getPlatformBlogPostBySlug({
  context,
  database,
  options = {},
  slug,
}: {
  context: PlatformRequestContext;
  database: Database;
  options?: BlogPostOptions;
  slug: string;
}): Promise<BlogPostResponse> {
  const normalizedSlug = normalizeSlugFilter(slug);
  if (!normalizedSlug) {
    throw new PlatformApiError({ code: "NOT_FOUND" });
  }

  const rows = await getVisibleBlogPosts({
    context,
    database,
    preview: options.preview,
  });
  const row = rows.find(
    (item) => item.slug === normalizedSlug && item.status !== "archived" && !item.deletedAt,
  );

  if (!row) {
    throw new PlatformApiError({ code: "NOT_FOUND" });
  }

  return {
    post: toPost({ context, preview: options.preview, row }),
  };
}

export async function listPlatformBlogCategories({
  context,
  database,
}: {
  context: PlatformRequestContext;
  database: Database;
}): Promise<BlogCategoryListResponse> {
  await requireEnabledModule({ context, database, moduleKey: "blog" });

  const rows = await database.query.blogCategories.findMany({
    where: and(
      eq(blogCategories.organizationId, context.organizationId),
      eq(blogCategories.websiteId, context.websiteId),
      isNull(blogCategories.deletedAt),
    ),
    orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
  });

  return {
    items: rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug })),
  };
}

export async function listPlatformBlogTags({
  context,
  database,
}: {
  context: PlatformRequestContext;
  database: Database;
}): Promise<BlogTagListResponse> {
  await requireEnabledModule({ context, database, moduleKey: "blog" });

  const rows = await database.query.blogTags.findMany({
    where: and(
      eq(blogTags.organizationId, context.organizationId),
      eq(blogTags.websiteId, context.websiteId),
      isNull(blogTags.deletedAt),
    ),
    orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
  });

  return {
    items: rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug })),
  };
}
