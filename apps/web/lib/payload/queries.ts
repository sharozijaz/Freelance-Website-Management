import { notFound } from "next/navigation";
import type { Navigation, PayloadMedia, PayloadPage, PayloadPost, SiteSettings } from "./types";
import { findFirstPayloadDoc, findPayloadDocs } from "./client";

function withTenant({
  organizationId,
  websiteId,
}: {
  organizationId: string | null;
  websiteId?: string | null | undefined;
}) {
  if (!organizationId) {
    return {
      organizationId: {
        equals: "__missing_organization__",
      },
    };
  }

  const where = {
    organizationId: {
      equals: organizationId,
    },
  };

  if (websiteId) {
    return {
      ...where,
      websiteId: {
        equals: websiteId,
      },
    };
  }

  return where;
}

export async function getPageBySlug({
  organizationId,
  slug,
  websiteId,
}: {
  organizationId: string | null;
  slug: string;
  websiteId?: string | null;
}): Promise<PayloadPage | null> {
  if (!organizationId) {
    return null;
  }

  return findFirstPayloadDoc<PayloadPage>({
    collection: "pages",
    depth: 3,
    tags: [`tenant:${organizationId}`, `page:${slug}`],
    where: {
      ...withTenant({ organizationId, websiteId }),
      slug: {
        equals: slug,
      },
      workflowStatus: {
        not_equals: "archived",
      },
    },
  });
}

export async function requirePageBySlug(input: {
  organizationId: string | null;
  slug: string;
  websiteId?: string | null;
}): Promise<PayloadPage> {
  const page = await getPageBySlug(input);

  if (!page) {
    notFound();
  }

  return page;
}

export async function getPostBySlug({
  organizationId,
  slug,
}: {
  organizationId: string | null;
  slug: string;
}): Promise<PayloadPost | null> {
  if (!organizationId) {
    return null;
  }

  return findFirstPayloadDoc<PayloadPost>({
    collection: "posts",
    depth: 3,
    tags: [`tenant:${organizationId}`, `post:${slug}`],
    where: {
      ...withTenant({ organizationId }),
      slug: {
        equals: slug,
      },
    },
  });
}

export async function getRecentPosts({
  limit = 12,
  organizationId,
}: {
  limit?: number;
  organizationId: string | null;
}): Promise<PayloadPost[]> {
  if (!organizationId) {
    return [];
  }

  const posts = await findPayloadDocs<PayloadPost>({
    collection: "posts",
    depth: 2,
    limit,
    sort: "-publishDate",
    tags: [`tenant:${organizationId}`, "posts"],
    where: withTenant({ organizationId }),
  });

  return posts.docs;
}

export async function getNavigation({
  location,
  organizationId,
}: {
  location: "footer" | "header";
  organizationId: string | null;
}): Promise<Navigation | null> {
  if (!organizationId) {
    return null;
  }

  return findFirstPayloadDoc<Navigation>({
    collection: "navigation",
    depth: 3,
    tags: [`tenant:${organizationId}`, `navigation:${location}`],
    where: {
      ...withTenant({ organizationId }),
      location: {
        equals: location,
      },
    },
  });
}

export async function getSiteSettings({
  organizationId,
}: {
  organizationId: string | null;
}): Promise<SiteSettings | null> {
  if (!organizationId) {
    return null;
  }

  return findFirstPayloadDoc<SiteSettings>({
    collection: "site-settings",
    depth: 2,
    tags: [`tenant:${organizationId}`, "site-settings"],
    where: withTenant({ organizationId }),
  });
}

export async function getMediaById(id: string): Promise<PayloadMedia | null> {
  return findFirstPayloadDoc<PayloadMedia>({
    collection: "media",
    depth: 1,
    tags: [`media:${id}`],
    where: {
      id: {
        equals: id,
      },
    },
  });
}

export async function getAllPageSlugs({
  organizationId,
  websiteId,
}: {
  organizationId: string | null;
  websiteId?: string | null;
}): Promise<string[]> {
  if (!organizationId) {
    return [];
  }

  const pages = await findPayloadDocs<PayloadPage>({
    collection: "pages",
    depth: 0,
    limit: 100,
    tags: [`tenant:${organizationId}`, "pages"],
    where: {
      ...withTenant({ organizationId, websiteId }),
      workflowStatus: {
        not_equals: "archived",
      },
    },
  });

  return pages.docs.map((page) => page.slug);
}

export async function getPublishedPagesForSitemap({
  organizationId,
  websiteId,
}: {
  organizationId: string | null;
  websiteId?: string | null;
}): Promise<PayloadPage[]> {
  if (!organizationId) {
    return [];
  }

  const pages = await findPayloadDocs<PayloadPage>({
    collection: "pages",
    depth: 2,
    limit: 100,
    sort: "-updatedAt",
    tags: [`tenant:${organizationId}`, "pages:sitemap"],
    where: {
      ...withTenant({ organizationId, websiteId }),
      workflowStatus: {
        equals: "published",
      },
    },
  });

  return pages.docs;
}

export async function getAllPostSlugs({
  organizationId,
}: {
  organizationId: string | null;
}): Promise<string[]> {
  if (!organizationId) {
    return [];
  }

  const posts = await findPayloadDocs<PayloadPost>({
    collection: "posts",
    depth: 0,
    limit: 100,
    tags: [`tenant:${organizationId}`, "posts"],
    where: withTenant({ organizationId }),
  });

  return posts.docs.map((post) => post.slug);
}

export async function getPublishedPostsForSitemap({
  organizationId,
}: {
  organizationId: string | null;
}): Promise<PayloadPost[]> {
  if (!organizationId) {
    return [];
  }

  const posts = await findPayloadDocs<PayloadPost>({
    collection: "posts",
    depth: 2,
    limit: 100,
    sort: "-publishDate",
    tags: [`tenant:${organizationId}`, "posts:sitemap"],
    where: {
      ...withTenant({ organizationId }),
      _status: {
        equals: "published",
      },
    },
  });

  return posts.docs;
}
