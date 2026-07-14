import { relations } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, users, websites } from "./core";
import { blogPostStatusEnum } from "./enums";
import { mediaAssets } from "./placeholders";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export interface BlogContentDocument {
  format: "markdown";
  markdown: string;
}

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    content: jsonb("content").$type<BlogContentDocument>().notNull(),
    featuredMediaId: uuid("featured_media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    status: blogPostStatusEnum("status").notNull().default("draft"),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    seoTitle: text("seo_title"),
    metaDescription: text("meta_description"),
    canonicalUrl: text("canonical_url"),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("blog_posts_website_slug_idx").on(table.websiteId, table.slug),
    uniqueIndex("blog_posts_id_organization_website_idx").on(
      table.id,
      table.organizationId,
      table.websiteId,
    ),
    index("blog_posts_organization_website_status_idx").on(
      table.organizationId,
      table.websiteId,
      table.status,
    ),
    index("blog_posts_published_at_idx").on(table.websiteId, table.publishedAt),
    foreignKey({
      columns: [table.websiteId, table.organizationId],
      foreignColumns: [websites.id, websites.organizationId],
      name: "blog_posts_website_organization_fk",
    }).onDelete("cascade"),
  ],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("blog_categories_website_slug_idx").on(table.websiteId, table.slug),
    uniqueIndex("blog_categories_id_organization_website_idx").on(
      table.id,
      table.organizationId,
      table.websiteId,
    ),
    index("blog_categories_organization_website_idx").on(table.organizationId, table.websiteId),
    foreignKey({
      columns: [table.websiteId, table.organizationId],
      foreignColumns: [websites.id, websites.organizationId],
      name: "blog_categories_website_organization_fk",
    }).onDelete("cascade"),
  ],
);

export const blogPostCategories = pgTable(
  "blog_post_categories",
  {
    organizationId: uuid("organization_id").notNull(),
    websiteId: uuid("website_id").notNull(),
    postId: uuid("post_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.postId, table.categoryId],
      name: "blog_post_categories_pk",
    }),
    index("blog_post_categories_category_idx").on(table.categoryId),
    foreignKey({
      columns: [table.postId, table.organizationId, table.websiteId],
      foreignColumns: [blogPosts.id, blogPosts.organizationId, blogPosts.websiteId],
      name: "blog_post_categories_post_scope_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId, table.organizationId, table.websiteId],
      foreignColumns: [blogCategories.id, blogCategories.organizationId, blogCategories.websiteId],
      name: "blog_post_categories_category_scope_fk",
    }).onDelete("cascade"),
  ],
);

export const blogTags = pgTable(
  "blog_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("blog_tags_website_slug_idx").on(table.websiteId, table.slug),
    uniqueIndex("blog_tags_id_organization_website_idx").on(
      table.id,
      table.organizationId,
      table.websiteId,
    ),
    index("blog_tags_organization_website_idx").on(table.organizationId, table.websiteId),
    foreignKey({
      columns: [table.websiteId, table.organizationId],
      foreignColumns: [websites.id, websites.organizationId],
      name: "blog_tags_website_organization_fk",
    }).onDelete("cascade"),
  ],
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    organizationId: uuid("organization_id").notNull(),
    websiteId: uuid("website_id").notNull(),
    postId: uuid("post_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.postId, table.tagId],
      name: "blog_post_tags_pk",
    }),
    index("blog_post_tags_tag_idx").on(table.tagId),
    foreignKey({
      columns: [table.postId, table.organizationId, table.websiteId],
      foreignColumns: [blogPosts.id, blogPosts.organizationId, blogPosts.websiteId],
      name: "blog_post_tags_post_scope_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.tagId, table.organizationId, table.websiteId],
      foreignColumns: [blogTags.id, blogTags.organizationId, blogTags.websiteId],
      name: "blog_post_tags_tag_scope_fk",
    }).onDelete("cascade"),
  ],
);

export const blogPostRelations = relations(blogPosts, ({ many, one }) => ({
  author: one(users, {
    fields: [blogPosts.authorUserId],
    references: [users.id],
  }),
  categories: many(blogPostCategories),
  featuredMedia: one(mediaAssets, {
    fields: [blogPosts.featuredMediaId],
    references: [mediaAssets.id],
  }),
  organization: one(organizations, {
    fields: [blogPosts.organizationId],
    references: [organizations.id],
  }),
  tags: many(blogPostTags),
  website: one(websites, {
    fields: [blogPosts.websiteId],
    references: [websites.id],
  }),
}));

export const blogCategoryRelations = relations(blogCategories, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [blogCategories.organizationId],
    references: [organizations.id],
  }),
  posts: many(blogPostCategories),
  website: one(websites, {
    fields: [blogCategories.websiteId],
    references: [websites.id],
  }),
}));

export const blogPostCategoryRelations = relations(blogPostCategories, ({ one }) => ({
  category: one(blogCategories, {
    fields: [blogPostCategories.categoryId],
    references: [blogCategories.id],
  }),
  post: one(blogPosts, {
    fields: [blogPostCategories.postId],
    references: [blogPosts.id],
  }),
}));

export const blogTagRelations = relations(blogTags, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [blogTags.organizationId],
    references: [organizations.id],
  }),
  posts: many(blogPostTags),
  website: one(websites, {
    fields: [blogTags.websiteId],
    references: [websites.id],
  }),
}));

export const blogPostTagRelations = relations(blogPostTags, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogPostTags.postId],
    references: [blogPosts.id],
  }),
  tag: one(blogTags, {
    fields: [blogPostTags.tagId],
    references: [blogTags.id],
  }),
}));
