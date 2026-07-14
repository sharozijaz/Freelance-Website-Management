import { describe, expect, it, vi } from "vitest";
import { createSharozClient, SharozApiError } from "./sdk";

const publicKey = `spk_${"a".repeat(32)}`;
const secret = `sps_${"b".repeat(43)}`;

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function inputToUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function contextBody() {
  return {
    data: {
      credential: { id: "credential_1", label: "Production" },
      enabledModules: ["blog"],
      environment: {
        baseUrl: "https://staging.example.com",
        id: "environment_1",
        name: "Staging",
        type: "staging",
      },
      organization: { id: "org_1", name: "Client" },
      website: { id: "website_1", name: "Website", type: "sharoz_connected" },
    },
  };
}

function blogListBody() {
  return {
    data: {
      items: [
        {
          categories: [{ id: "category_1", name: "News", slug: "news" }],
          excerpt: "Excerpt",
          featuredMedia: null,
          id: "post_1",
          publishedAt: "2026-07-13T00:00:00.000Z",
          slug: "hello-world",
          tags: [{ id: "tag_1", name: "Featured", slug: "featured" }],
          title: "Hello World",
        },
      ],
      pagination: {
        hasNextPage: false,
        hasPreviousPage: false,
        limit: 10,
        page: 1,
        total: 1,
        totalPages: 1,
      },
    },
  };
}

function blogPostBody() {
  return {
    data: {
      post: {
        ...blogListBody().data.items[0],
        content: { format: "markdown", markdown: "# Hello" },
        seo: {
          canonicalUrl: null,
          metaDescription: null,
          metaTitle: null,
          robots: { follow: true, index: true },
        },
      },
    },
  };
}

function mediaListBody() {
  return {
    data: {
      items: [
        {
          altText: "Alt",
          createdAt: "2026-07-13T00:00:00.000Z",
          filename: "image.jpg",
          height: 600,
          id: "media_1",
          mimeType: "image/jpeg",
          url: "https://cdn.example.com/image.jpg",
          width: 800,
        },
      ],
      pagination: {
        hasNextPage: false,
        hasPreviousPage: false,
        limit: 10,
        page: 1,
        total: 1,
        totalPages: 1,
      },
    },
  };
}

function mediaAssetBody() {
  return {
    data: {
      asset: mediaListBody().data.items[0],
    },
  };
}

function formListBody() {
  return {
    data: {
      items: [
        {
          fields: [
            {
              id: "field_1",
              label: "Email",
              name: "email",
              placeholder: "you@example.com",
              required: true,
              type: "email",
            },
          ],
          id: "form_1",
          name: "Contact",
          slug: "contact",
          successMessage: "Thanks.",
        },
      ],
      pagination: {
        hasNextPage: false,
        hasPreviousPage: false,
        limit: 10,
        page: 1,
        total: 1,
        totalPages: 1,
      },
    },
  };
}

function formBody() {
  return {
    data: {
      form: formListBody().data.items[0],
    },
  };
}

function formSubmitBody() {
  return {
    data: {
      submittedAt: "2026-07-13T00:00:00.000Z",
      submissionId: "submission_1",
    },
  };
}

describe("createSharozClient", () => {
  it("validates client configuration", () => {
    expect(() =>
      createSharozClient({
        baseUrl: "not-a-url",
        publicKey,
        secret,
      }),
    ).toThrow("absolute URL");

    expect(() =>
      createSharozClient({
        baseUrl: "https://platform.test",
        publicKey: "bad",
        secret,
      }),
    ).toThrow("publicKey");
  });

  it("normalizes base URLs and sends the credential in Authorization only", async () => {
    const requestedInits: RequestInit[] = [];
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrls.push(inputToUrl(input));
      if (init) {
        requestedInits.push(init);
      }
      return Promise.resolve(jsonResponse(contextBody()));
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test/",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    const context = await client.context.get();

    expect(context.website.id).toBe("website_1");
    expect(requestedUrls[0]).toBe("https://platform.test/api/platform/v1/context");
    expect(requestedInits[0]?.method).toBe("GET");
    expect(requestedInits[0]?.headers).toMatchObject({
      Authorization: `Bearer ${publicKey}.${secret}`,
    });
    expect(requestedUrls[0]).not.toContain(secret);
  });

  it("serializes Blog list query options safely without putting credentials in URLs", async () => {
    const requestedInits: RequestInit[] = [];
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrls.push(inputToUrl(input));
      if (init) requestedInits.push(init);
      return Promise.resolve(jsonResponse(blogListBody()));
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    const posts = await client.blog.posts.list({
      category: "client news",
      limit: 10,
      page: 2,
      preview: true,
      tag: "a/b",
    });

    expect(posts.items[0]?.slug).toBe("hello-world");
    expect(requestedUrls[0]).toBe(
      "https://platform.test/api/platform/v1/blog/posts?category=client+news&limit=10&page=2&tag=a%2Fb",
    );
    expect(requestedUrls[0]).not.toContain(secret);
    expect(requestedUrls[0]).not.toContain(publicKey);
    expect(requestedUrls[0]).not.toContain("preview");
    expect(requestedInits[0]?.headers).toMatchObject({
      Authorization: `Bearer ${publicKey}.${secret}`,
      "X-Sharoz-Preview": "true",
    });
  });

  it("omits undefined Blog options and URL-encodes slugs", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      requestedUrls.push(inputToUrl(input));
      return Promise.resolve(jsonResponse(blogPostBody()));
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    const post = await client.blog.posts.getBySlug("hello world/a");

    expect(post.post.content.markdown).toBe("# Hello");
    expect(requestedUrls[0]).toBe(
      "https://platform.test/api/platform/v1/blog/posts/hello%20world%2Fa",
    );
  });

  it("reads Blog categories and tags", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = inputToUrl(input);
      requestedUrls.push(url);
      if (url.endsWith("/categories")) {
        return Promise.resolve(
          jsonResponse({ data: { items: [{ id: "category_1", name: "News", slug: "news" }] } }),
        );
      }
      return Promise.resolve(
        jsonResponse({ data: { items: [{ id: "tag_1", name: "Featured", slug: "featured" }] } }),
      );
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    await expect(client.blog.categories.list()).resolves.toMatchObject({
      items: [{ slug: "news" }],
    });
    await expect(client.blog.tags.list()).resolves.toMatchObject({
      items: [{ slug: "featured" }],
    });
  });

  it("serializes Media list query options and parses Media contracts", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      requestedUrls.push(inputToUrl(input));
      return Promise.resolve(jsonResponse(mediaListBody()));
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    const media = await client.media.list({ limit: 10, page: 2 });

    expect(media.items[0]).toMatchObject({
      filename: "image.jpg",
      url: "https://cdn.example.com/image.jpg",
    });
    expect(requestedUrls[0]).toBe("https://platform.test/api/platform/v1/media?limit=10&page=2");
    expect(requestedUrls[0]).not.toContain(secret);
  });

  it("URL-encodes Media IDs", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      requestedUrls.push(inputToUrl(input));
      return Promise.resolve(jsonResponse(mediaAssetBody()));
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    const media = await client.media.getById("media one/two");

    expect(media.asset.id).toBe("media_1");
    expect(requestedUrls[0]).toBe("https://platform.test/api/platform/v1/media/media%20one%2Ftwo");
  });

  it("surfaces Media API errors", async () => {
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            {
              error: {
                code: "NOT_FOUND",
                message: "The requested resource was not found.",
              },
            },
            { status: 404 },
          ),
        ),
      ),
      publicKey,
      secret,
    });

    await expect(client.media.getById("missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });

  it("serializes Forms list query options and parses Forms contracts", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      requestedUrls.push(inputToUrl(input));
      return Promise.resolve(jsonResponse(formListBody()));
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    const forms = await client.forms.list({ limit: 10, page: 2 });

    expect(forms.items[0]?.slug).toBe("contact");
    expect(requestedUrls[0]).toBe("https://platform.test/api/platform/v1/forms?limit=10&page=2");
  });

  it("URL-encodes Form slugs", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      requestedUrls.push(inputToUrl(input));
      return Promise.resolve(jsonResponse(formBody()));
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    const form = await client.forms.getBySlug("contact us");

    expect(form.form.name).toBe("Contact");
    expect(requestedUrls[0]).toBe("https://platform.test/api/platform/v1/forms/contact%20us");
  });

  it("submits Form payloads as JSON without credentials in URLs", async () => {
    const requestedInits: RequestInit[] = [];
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrls.push(inputToUrl(input));
      if (init) requestedInits.push(init);
      return Promise.resolve(jsonResponse(formSubmitBody(), { status: 201 }));
    });
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    const submission = await client.forms.submit("contact/us", {
      fields: { email: "client@example.com", message: "Hello" },
    });

    expect(submission.submissionId).toBe("submission_1");
    expect(requestedUrls[0]).toBe(
      "https://platform.test/api/platform/v1/forms/contact%2Fus/submissions",
    );
    expect(requestedUrls[0]).not.toContain(secret);
    expect(requestedInits[0]).toMatchObject({
      body: JSON.stringify({ fields: { email: "client@example.com", message: "Hello" } }),
      method: "POST",
    });
    expect(requestedInits[0]?.headers).toMatchObject({
      Authorization: `Bearer ${publicKey}.${secret}`,
      "Content-Type": "application/json",
    });
  });

  it("surfaces Form API errors and rejects malformed Form responses", async () => {
    const errorClient = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            {
              error: {
                code: "INVALID_REQUEST",
                message: "email is required.",
              },
            },
            { status: 400 },
          ),
        ),
      ),
      publicKey,
      secret,
    });
    const malformedClient = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: vi.fn(() => Promise.resolve(jsonResponse({ data: { form: { id: "bad" } } }))),
      publicKey,
      secret,
    });

    await expect(
      errorClient.forms.submit("contact", { fields: { name: "Client" } }),
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      status: 400,
    });
    await expect(malformedClient.forms.getBySlug("contact")).rejects.toThrow();
  });

  it("surfaces Blog API errors and rejects malformed Blog responses", async () => {
    const notFoundClient = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            { error: { code: "NOT_FOUND", message: "The requested resource was not found." } },
            { status: 404 },
          ),
        ),
      ),
      publicKey,
      secret,
    });
    const malformedClient = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: vi.fn(() => Promise.resolve(jsonResponse({ data: { items: "bad" } }))),
      publicKey,
      secret,
    });

    await expect(notFoundClient.blog.posts.getBySlug("missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    await expect(malformedClient.blog.posts.list()).rejects.toThrow();
  });

  it("parses Platform API errors into SharozApiError", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        jsonResponse(
          {
            error: {
              code: "MODULE_NOT_ENABLED",
              message: "The requested module is not available.",
            },
          },
          { status: 403 },
        ),
      ),
    );
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    await expect(client.context.get()).rejects.toMatchObject({
      code: "MODULE_NOT_ENABLED",
      status: 403,
    });

    try {
      await client.context.get();
    } catch (error) {
      expect(error).toBeInstanceOf(SharozApiError);
    }
  });

  it("rejects malformed success responses", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ data: { website: { id: "missing" } } })),
    );
    const client = createSharozClient({
      baseUrl: "https://platform.test",
      fetch: fetchMock,
      publicKey,
      secret,
    });

    await expect(client.context.get()).rejects.toThrow();
  });
});
