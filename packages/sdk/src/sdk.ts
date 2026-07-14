import {
  platformApiErrorResponseSchema,
  platformApiSuccessResponseSchema,
  blogCategoryListResponseSchema,
  blogPostListResponseSchema,
  blogPostResponseSchema,
  blogTagListResponseSchema,
  formListResponseSchema,
  formResponseSchema,
  formSubmitResponseSchema,
  mediaAssetResponseSchema,
  mediaListResponseSchema,
  platformContextResponseSchema,
  type BlogCategoryListResponse,
  type BlogPostListResponse,
  type BlogPostResponse,
  type BlogTagListResponse,
  type FormListResponse,
  type FormResponse,
  type FormSubmitRequest,
  type FormSubmitResponse,
  type MediaAssetResponse,
  type MediaListResponse,
  type PlatformApiErrorCode,
  type PlatformContextResponse,
} from "@sharoz/contracts";

export type { PublicFormField } from "@sharoz/contracts";

export type SharozFetch = typeof fetch;

export interface SharozClientConfig {
  baseUrl: string;
  publicKey: string;
  secret: string;
  fetch?: SharozFetch;
}

export interface SharozClient {
  blog: {
    categories: {
      list: () => Promise<BlogCategoryListResponse>;
    };
    posts: {
      getBySlug: (slug: string, options?: SharozBlogPostOptions) => Promise<BlogPostResponse>;
      list: (options?: SharozBlogPostListOptions) => Promise<BlogPostListResponse>;
    };
    tags: {
      list: () => Promise<BlogTagListResponse>;
    };
  };
  context: {
    get: () => Promise<PlatformContextResponse>;
  };
  forms: {
    getBySlug: (slug: string) => Promise<FormResponse>;
    list: (options?: SharozFormListOptions) => Promise<FormListResponse>;
    submit: (slug: string, input: FormSubmitRequest) => Promise<FormSubmitResponse>;
  };
  media: {
    getById: (id: string) => Promise<MediaAssetResponse>;
    list: (options?: SharozMediaListOptions) => Promise<MediaListResponse>;
  };
  request: <T>(path: string, options?: SharozRequestOptions<T>) => Promise<T>;
}

export interface SharozBlogPostListOptions {
  category?: string;
  limit?: number;
  page?: number;
  preview?: boolean;
  tag?: string;
}

export interface SharozBlogPostOptions {
  preview?: boolean;
}

export interface SharozMediaListOptions {
  limit?: number;
  page?: number;
}

export interface SharozFormListOptions {
  limit?: number;
  page?: number;
}

export interface SharozRequestOptions<T> {
  body?: unknown;
  headers?: Record<string, string>;
  method?: "DELETE" | "GET" | "PATCH" | "POST";
  parse?: (value: unknown) => T;
}

function appendQuery(path: string, params: Record<string, boolean | number | string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function previewHeaders(enabled?: boolean): Record<string, string> {
  return enabled === true ? { "X-Sharoz-Preview": "true" } : {};
}

export class SharozApiError extends Error {
  readonly code: PlatformApiErrorCode;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: {
    code: PlatformApiErrorCode;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "SharozApiError";
    this.code = code;
    this.status = status;
  }
}

export function isSharozApiError(error: unknown): error is SharozApiError {
  return error instanceof SharozApiError;
}

function assertServerCredential(value: string, prefix: "spk" | "sps", label: string) {
  const pattern = prefix === "spk" ? /^spk_[A-Za-z0-9_-]{32,}$/ : /^sps_[A-Za-z0-9_-]{43,}$/;

  if (!pattern.test(value)) {
    throw new Error(`${label} is not a valid Sharoz website credential.`);
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("Sharoz baseUrl must be an absolute URL.");
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("Sharoz baseUrl must use HTTPS outside local development.");
  }

  return url.toString().replace(/\/$/, "");
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SharozApiError({
      code: "INTERNAL_ERROR",
      message: "The Sharoz Platform API returned invalid JSON.",
      status: response.status,
    });
  }
}

function parseErrorResponse(value: unknown, status: number): SharozApiError {
  const parsed = platformApiErrorResponseSchema.safeParse(value);

  if (!parsed.success) {
    return new SharozApiError({
      code: "INTERNAL_ERROR",
      message: "The Sharoz Platform API returned an unexpected error response.",
      status,
    });
  }

  return new SharozApiError({
    code: parsed.data.error.code,
    message: parsed.data.error.message,
    status,
  });
}

export function createSharozClient(config: SharozClientConfig): SharozClient {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  assertServerCredential(config.publicKey, "spk", "publicKey");
  assertServerCredential(config.secret, "sps", "secret");

  const fetchImpl = config.fetch ?? globalThis.fetch;

  const authorization = `Bearer ${config.publicKey}.${config.secret}`;

  async function request<T>(path: string, options: SharozRequestOptions<T> = {}): Promise<T> {
    if (!path.startsWith("/")) {
      throw new Error("Sharoz SDK request paths must start with '/'.");
    }

    const init: RequestInit = {
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      method: options.method ?? "GET",
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetchImpl(`${baseUrl}${path}`, init);
    const json = await readJsonResponse(response);

    if (!response.ok) {
      throw parseErrorResponse(json, response.status);
    }

    return options.parse ? options.parse(json) : (json as T);
  }

  return {
    blog: {
      categories: {
        list: async () =>
          request<BlogCategoryListResponse>("/api/platform/v1/blog/categories", {
            parse: (value) =>
              platformApiSuccessResponseSchema(blogCategoryListResponseSchema).parse(value).data,
          }),
      },
      posts: {
        getBySlug: async (slug, options = {}) =>
          request<BlogPostResponse>(`/api/platform/v1/blog/posts/${encodeURIComponent(slug)}`, {
            headers: previewHeaders(options.preview),
            parse: (value) =>
              platformApiSuccessResponseSchema(blogPostResponseSchema).parse(value).data,
          }),
        list: async (options = {}) =>
          request<BlogPostListResponse>(
            appendQuery("/api/platform/v1/blog/posts", {
              category: options.category,
              limit: options.limit,
              page: options.page,
              tag: options.tag,
            }),
            {
              headers: previewHeaders(options.preview),
              parse: (value) =>
                platformApiSuccessResponseSchema(blogPostListResponseSchema).parse(value).data,
            },
          ),
      },
      tags: {
        list: async () =>
          request<BlogTagListResponse>("/api/platform/v1/blog/tags", {
            parse: (value) =>
              platformApiSuccessResponseSchema(blogTagListResponseSchema).parse(value).data,
          }),
      },
    },
    context: {
      get: async () => {
        const context = await request<PlatformContextResponse>("/api/platform/v1/context", {
          parse: (value) =>
            platformApiSuccessResponseSchema(platformContextResponseSchema).parse(value).data,
        });

        return context;
      },
    },
    media: {
      getById: async (id) =>
        request<MediaAssetResponse>(`/api/platform/v1/media/${encodeURIComponent(id)}`, {
          parse: (value) =>
            platformApiSuccessResponseSchema(mediaAssetResponseSchema).parse(value).data,
        }),
      list: async (options = {}) =>
        request<MediaListResponse>(
          appendQuery("/api/platform/v1/media", {
            limit: options.limit,
            page: options.page,
          }),
          {
            parse: (value) =>
              platformApiSuccessResponseSchema(mediaListResponseSchema).parse(value).data,
          },
        ),
    },
    forms: {
      getBySlug: async (slug) =>
        request<FormResponse>(`/api/platform/v1/forms/${encodeURIComponent(slug)}`, {
          parse: (value) => platformApiSuccessResponseSchema(formResponseSchema).parse(value).data,
        }),
      list: async (options = {}) =>
        request<FormListResponse>(
          appendQuery("/api/platform/v1/forms", {
            limit: options.limit,
            page: options.page,
          }),
          {
            parse: (value) =>
              platformApiSuccessResponseSchema(formListResponseSchema).parse(value).data,
          },
        ),
      submit: async (slug, input) =>
        request<FormSubmitResponse>(
          `/api/platform/v1/forms/${encodeURIComponent(slug)}/submissions`,
          {
            body: input,
            method: "POST",
            parse: (value) =>
              platformApiSuccessResponseSchema(formSubmitResponseSchema).parse(value).data,
          },
        ),
    },
    request: <T>(path: string, options?: SharozRequestOptions<T>) => request<T>(path, options),
  };
}
