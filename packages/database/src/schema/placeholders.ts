import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations, users, websites } from "./core";
import { contentPlaceholderStatusEnum } from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const pages = pgTable(
  "pages",
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
    status: contentPlaceholderStatusEnum("status").notNull().default("draft"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("pages_organization_website_slug_idx").on(
      table.organizationId,
      table.websiteId,
      table.slug,
    ),
    index("pages_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const posts = pgTable(
  "posts",
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
    status: contentPlaceholderStatusEnum("status").notNull().default("draft"),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("posts_organization_website_slug_idx").on(
      table.organizationId,
      table.websiteId,
      table.slug,
    ),
    index("posts_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "set null" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    storageKey: text("storage_key").notNull(),
    altText: text("alt_text"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("media_assets_organization_storage_key_idx").on(
      table.organizationId,
      table.storageKey,
    ),
    index("media_assets_organization_mime_type_idx").on(table.organizationId, table.mimeType),
  ],
);

export const forms = pgTable(
  "forms",
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
    status: contentPlaceholderStatusEnum("status").notNull().default("draft"),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("forms_organization_website_slug_idx").on(
      table.organizationId,
      table.websiteId,
      table.slug,
    ),
    index("forms_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const seoMetadata = pgTable(
  "seo_metadata",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("seo_metadata_resource_idx").on(
      table.organizationId,
      table.websiteId,
      table.resourceType,
      table.resourceId,
    ),
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    path: text("path"),
    referrer: text("referrer"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("analytics_events_organization_website_occurred_at_idx").on(
      table.organizationId,
      table.websiteId,
      table.occurredAt,
    ),
    index("analytics_events_organization_event_name_idx").on(table.organizationId, table.eventName),
  ],
);

export const pageRelations = relations(pages, ({ one }) => ({
  createdBy: one(users, {
    fields: [pages.createdByUserId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [pages.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [pages.websiteId],
    references: [websites.id],
  }),
}));

export const postRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorUserId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [posts.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [posts.websiteId],
    references: [websites.id],
  }),
}));

export const mediaAssetRelations = relations(mediaAssets, ({ one }) => ({
  organization: one(organizations, {
    fields: [mediaAssets.organizationId],
    references: [organizations.id],
  }),
  uploadedBy: one(users, {
    fields: [mediaAssets.uploadedByUserId],
    references: [users.id],
  }),
  website: one(websites, {
    fields: [mediaAssets.websiteId],
    references: [websites.id],
  }),
}));

export const formRelations = relations(forms, ({ one }) => ({
  organization: one(organizations, {
    fields: [forms.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [forms.websiteId],
    references: [websites.id],
  }),
}));

export const seoMetadataRelations = relations(seoMetadata, ({ one }) => ({
  organization: one(organizations, {
    fields: [seoMetadata.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [seoMetadata.websiteId],
    references: [websites.id],
  }),
}));

export const analyticsEventRelations = relations(analyticsEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [analyticsEvents.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [analyticsEvents.websiteId],
    references: [websites.id],
  }),
}));
