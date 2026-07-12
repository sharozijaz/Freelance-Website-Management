import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations, users, websites } from "./core";
import { contentPlaceholderStatusEnum, formFieldTypeEnum, formSubmissionStatusEnum } from "./enums";

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

export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    label: text("label").notNull(),
    type: formFieldTypeEnum("type").notNull(),
    placeholder: text("placeholder"),
    helpText: text("help_text"),
    required: boolean("required").notNull().default(false),
    options: jsonb("options").$type<{ label: string; value: string }[]>().notNull().default([]),
    defaultValue: text("default_value"),
    validation: jsonb("validation").$type<Record<string, unknown>>().notNull().default({}),
    fieldOrder: integer("field_order").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("form_fields_form_name_idx").on(table.formId, table.name),
    index("form_fields_organization_website_idx").on(table.organizationId, table.websiteId),
    index("form_fields_form_order_idx").on(table.formId, table.fieldOrder),
  ],
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    status: formSubmissionStatusEnum("status").notNull().default("new"),
    data: jsonb("data").$type<Record<string, string | string[] | boolean>>().notNull().default({}),
    source: jsonb("source")
      .$type<{ ipHash?: string; path?: string; referrer?: string; userAgent?: string }>()
      .notNull()
      .default({}),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    spamAt: timestamp("spam_at", { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (table) => [
    index("form_submissions_organization_website_idx").on(table.organizationId, table.websiteId),
    index("form_submissions_form_status_idx").on(table.formId, table.status),
    index("form_submissions_submitted_at_idx").on(table.organizationId, table.submittedAt),
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

export const formRelations = relations(forms, ({ many, one }) => ({
  fields: many(formFields),
  organization: one(organizations, {
    fields: [forms.organizationId],
    references: [organizations.id],
  }),
  submissions: many(formSubmissions),
  website: one(websites, {
    fields: [forms.websiteId],
    references: [websites.id],
  }),
}));

export const formFieldRelations = relations(formFields, ({ one }) => ({
  form: one(forms, {
    fields: [formFields.formId],
    references: [forms.id],
  }),
  organization: one(organizations, {
    fields: [formFields.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [formFields.websiteId],
    references: [websites.id],
  }),
}));

export const formSubmissionRelations = relations(formSubmissions, ({ one }) => ({
  form: one(forms, {
    fields: [formSubmissions.formId],
    references: [forms.id],
  }),
  organization: one(organizations, {
    fields: [formSubmissions.organizationId],
    references: [organizations.id],
  }),
  website: one(websites, {
    fields: [formSubmissions.websiteId],
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
