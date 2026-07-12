import { createPreviewToken } from "@agency/lib/preview";
import type { CollectionAfterChangeHook, CollectionBeforeValidateHook } from "payload";

interface PageData {
  _status?: "draft" | "published";
  id: string;
  organizationId?: string;
  previewUrl?: string;
  slug?: string;
}

const reservedPageSegments = new Set([
  "admin",
  "api",
  "blog",
  "_next",
  "sitemap.xml",
  "robots.txt",
]);

function normalizeSlug(value: string | undefined): string {
  const slug = value?.trim().replace(/^\/+|\/+$/g, "") ?? "";

  return slug.length > 0 ? slug : "home";
}

function pagePathFromSlug(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

function getWebsiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3003"
  );
}

function getPreviewSecret(): string {
  return process.env.WEBSITE_PREVIEW_SECRET ?? "development-preview-secret";
}

function getRevalidationSecret(): string {
  return process.env.WEBSITE_REVALIDATION_SECRET ?? "development-revalidation-secret";
}

function hasReservedSegment(slug: string): boolean {
  const [firstSegment] = slug.split("/");

  return reservedPageSegments.has(firstSegment ?? "");
}

function assertValidSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(slug)) {
    throw new Error("Page slug must use lowercase letters, numbers, hyphens, and slashes.");
  }

  if (hasReservedSegment(slug)) {
    const [firstSegment = slug] = slug.split("/");

    throw new Error(`"${firstSegment}" is a reserved route segment.`);
  }
}

async function assertUniqueTenantSlug({
  id,
  organizationId,
  req,
  slug,
}: {
  id?: string | undefined;
  organizationId: string;
  req: Parameters<CollectionBeforeValidateHook>[0]["req"];
  slug: string;
}): Promise<void> {
  const result = await req.payload.find({
    collection: "pages",
    depth: 0,
    limit: 1,
    where: {
      and: [
        {
          organizationId: {
            equals: organizationId,
          },
        },
        {
          slug: {
            equals: slug,
          },
        },
        ...(id
          ? [
              {
                id: {
                  not_equals: id,
                },
              },
            ]
          : []),
      ],
    },
  });

  if (result.totalDocs > 0) {
    throw new Error(`A page with slug "${slug}" already exists for this organization.`);
  }
}

export const preparePageForSave: CollectionBeforeValidateHook<PageData> = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) {
    return data;
  }

  const slug = normalizeSlug(data.slug);
  const organizationId = data.organizationId ?? originalDoc?.organizationId;

  data.slug = slug;

  if (organizationId) {
    assertValidSlug(slug);

    await assertUniqueTenantSlug({
      id: data.id ?? originalDoc?.id,
      organizationId,
      req,
      slug,
    });

    const path = pagePathFromSlug(slug);
    const token = createPreviewToken({
      organizationId,
      path,
      secret: getPreviewSecret(),
    });

    data.previewUrl = `${getWebsiteBaseUrl()}/api/preview?token=${encodeURIComponent(token)}`;
  }

  return data;
};

export const revalidatePageAfterChange: CollectionAfterChangeHook<PageData> = async ({
  doc,
  req,
}) => {
  if (doc._status !== "published" || !doc.organizationId) {
    return doc;
  }

  const slug = normalizeSlug(doc.slug);
  const path = pagePathFromSlug(slug);
  const token = createPreviewToken({
    organizationId: doc.organizationId,
    path,
    secret: getRevalidationSecret(),
    ttlSeconds: 60,
  });

  await fetch(`${getWebsiteBaseUrl()}/api/revalidate`, {
    body: JSON.stringify({
      organizationId: doc.organizationId,
      path,
      tags: [`payload:pages`, `tenant:${doc.organizationId}`, `page:${slug}`],
      token,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).catch(() => {
    req.payload.logger.warn(`Failed to revalidate page path "${path}".`);
  });

  return doc;
};
