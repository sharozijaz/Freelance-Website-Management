import { z } from "zod";
import { moduleKeySchema, websiteTypeSchema } from "@agency/lib/modules";

export const platformApiErrorCodes = [
  "UNAUTHORIZED",
  "INVALID_REQUEST",
  "MODULE_NOT_ENABLED",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type PlatformApiErrorCode = (typeof platformApiErrorCodes)[number];

export const platformApiErrorCodeSchema = z.enum(platformApiErrorCodes);

export const platformApiErrorResponseSchema = z.object({
  error: z.object({
    code: platformApiErrorCodeSchema,
    message: z.string(),
  }),
});

export type PlatformApiErrorResponse = z.infer<typeof platformApiErrorResponseSchema>;

export const platformApiSuccessResponseSchema = <T extends z.ZodType>(schema: T) =>
  z.object({
    data: schema,
  });

export interface PlatformApiSuccessResponse<T> {
  data: T;
}

export const blogContentDocumentSchema = z.object({
  format: z.literal("markdown"),
  markdown: z.string(),
});

export type BlogContentDocument = z.infer<typeof blogContentDocumentSchema>;

export const mediaAssetSchema = z.object({
  altText: z.string().nullable(),
  createdAt: z.string(),
  filename: z.string(),
  height: z.number().int().positive().nullable(),
  id: z.string(),
  mimeType: z.string(),
  url: z.url().nullable(),
  width: z.number().int().positive().nullable(),
});

export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const mediaPaginationSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  limit: z.number().int().positive(),
  page: z.number().int().positive(),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type MediaPagination = z.infer<typeof mediaPaginationSchema>;

export const mediaListResponseSchema = z.object({
  items: z.array(mediaAssetSchema),
  pagination: mediaPaginationSchema,
});

export type MediaListResponse = z.infer<typeof mediaListResponseSchema>;

export const mediaAssetResponseSchema = z.object({
  asset: mediaAssetSchema,
});

export type MediaAssetResponse = z.infer<typeof mediaAssetResponseSchema>;

export const formFieldTypeSchema = z.enum([
  "text",
  "email",
  "tel",
  "textarea",
  "select",
  "checkbox",
]);

export type FormFieldType = z.infer<typeof formFieldTypeSchema>;

export const formFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export type FormFieldOption = z.infer<typeof formFieldOptionSchema>;

export const publicFormFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  name: z.string(),
  options: z.array(formFieldOptionSchema).optional(),
  placeholder: z.string().nullable(),
  required: z.boolean(),
  type: formFieldTypeSchema,
});

export type PublicFormField = z.infer<typeof publicFormFieldSchema>;

export const publicFormSchema = z.object({
  fields: z.array(publicFormFieldSchema),
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  successMessage: z.string().nullable(),
});

export type PublicForm = z.infer<typeof publicFormSchema>;

export const formPaginationSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  limit: z.number().int().positive(),
  page: z.number().int().positive(),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type FormPagination = z.infer<typeof formPaginationSchema>;

export const formListResponseSchema = z.object({
  items: z.array(publicFormSchema),
  pagination: formPaginationSchema,
});

export type FormListResponse = z.infer<typeof formListResponseSchema>;

export const formResponseSchema = z.object({
  form: publicFormSchema,
});

export type FormResponse = z.infer<typeof formResponseSchema>;

export const formSubmissionValueSchema = z.union([z.string(), z.boolean(), z.array(z.string())]);

export const formSubmitRequestSchema = z.object({
  fields: z.record(z.string(), formSubmissionValueSchema),
});

export type FormSubmitRequest = z.infer<typeof formSubmitRequestSchema>;

export const formSubmitResponseSchema = z.object({
  submittedAt: z.string(),
  submissionId: z.string(),
});

export type FormSubmitResponse = z.infer<typeof formSubmitResponseSchema>;

export const blogFeaturedMediaSchema = mediaAssetSchema.omit({
  createdAt: true,
  filename: true,
});

export type BlogFeaturedMedia = z.infer<typeof blogFeaturedMediaSchema>;

export const blogCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type BlogCategory = z.infer<typeof blogCategorySchema>;

export const blogTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type BlogTag = z.infer<typeof blogTagSchema>;

export const blogSeoSchema = z.object({
  canonicalUrl: z.string().nullable(),
  metaDescription: z.string().nullable(),
  metaTitle: z.string().nullable(),
  robots: z.object({
    follow: z.boolean(),
    index: z.boolean(),
  }),
});

export type BlogSeo = z.infer<typeof blogSeoSchema>;

export const blogPostStatusSchema = z.enum(["draft", "published"]);

export const blogPostSummarySchema = z.object({
  categories: z.array(blogCategorySchema),
  excerpt: z.string(),
  featuredMedia: blogFeaturedMediaSchema.nullable(),
  id: z.string(),
  publishedAt: z.string().nullable(),
  slug: z.string(),
  status: blogPostStatusSchema.optional(),
  tags: z.array(blogTagSchema),
  title: z.string(),
});

export type BlogPostSummary = z.infer<typeof blogPostSummarySchema>;

export const blogPostSchema = blogPostSummarySchema.extend({
  content: blogContentDocumentSchema,
  seo: blogSeoSchema,
});

export type BlogPost = z.infer<typeof blogPostSchema>;

export const blogPaginationSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  limit: z.number().int().positive(),
  page: z.number().int().positive(),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type BlogPagination = z.infer<typeof blogPaginationSchema>;

export const blogPostListResponseSchema = z.object({
  items: z.array(blogPostSummarySchema),
  pagination: blogPaginationSchema,
});

export type BlogPostListResponse = z.infer<typeof blogPostListResponseSchema>;

export const blogPostResponseSchema = z.object({
  post: blogPostSchema,
});

export type BlogPostResponse = z.infer<typeof blogPostResponseSchema>;

export const blogCategoryListResponseSchema = z.object({
  items: z.array(blogCategorySchema),
});

export type BlogCategoryListResponse = z.infer<typeof blogCategoryListResponseSchema>;

export const blogTagListResponseSchema = z.object({
  items: z.array(blogTagSchema),
});

export type BlogTagListResponse = z.infer<typeof blogTagListResponseSchema>;

export const platformContextResponseSchema = z.object({
  credential: z.object({
    id: z.string(),
    label: z.string(),
  }),
  enabledModules: z.array(moduleKeySchema),
  environment: z.object({
    baseUrl: z.string().nullable(),
    id: z.string(),
    name: z.string(),
    type: z.enum(["staging", "production"]),
  }),
  organization: z.object({
    id: z.string(),
    name: z.string(),
  }),
  website: z.object({
    id: z.string(),
    name: z.string(),
    type: websiteTypeSchema,
  }),
});

export type PlatformContextResponse = z.infer<typeof platformContextResponseSchema>;
