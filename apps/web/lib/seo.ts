import type { Metadata } from "next";
import {
  normalizeSeoMetadata,
  resolveCanonicalUrl,
  type SeoContentResource,
  type WebsiteSeoDefaults,
} from "@agency/lib/seo";
import { websiteBaseUrl } from "./config";
import { getMediaAlt, getMediaUrl, isMedia } from "./media";
import type { PayloadPage, PayloadPost, SiteSettings } from "./payload/types";

interface BuildMetadataInput {
  content?: PayloadPage | PayloadPost | null;
  pathname: string;
  settings?: SiteSettings | null | undefined;
}

function getWebsiteSeoDefaults(settings?: SiteSettings | null): WebsiteSeoDefaults {
  return {
    canonicalBaseUrl: settings?.seo?.canonicalBaseUrl ?? websiteBaseUrl,
    defaultMetaDescription: settings?.seo?.defaultMetaDescription ?? settings?.brand?.tagline ?? null,
    defaultOgImage: settings?.seo?.defaultOgImage ?? null,
    defaultRobots: settings?.seo?.defaultRobots ?? null,
    locale: settings?.seo?.locale ?? "en_US",
    siteName: settings?.seo?.siteName ?? settings?.siteName ?? null,
    siteTitle: settings?.seo?.siteTitle ?? settings?.siteName ?? null,
    titleTemplate: settings?.seo?.titleTemplate ?? `%s | ${settings?.siteName ?? "Website"}`,
  };
}

function isPost(content: PayloadPage | PayloadPost): content is PayloadPost {
  return "content" in content;
}

function toSeoResource(content?: PayloadPage | PayloadPost | null): SeoContentResource | null {
  if (!content) return null;

  const post = isPost(content);

  return {
    authorName: typeof content.author === "object" ? content.author.name : null,
    blocks: "layout" in content ? content.layout : null,
    excerpt: "excerpt" in content ? content.excerpt ?? null : null,
    featuredImage: content.featuredImage ?? null,
    id: content.id,
    organizationId: content.organizationId,
    publishedAt: "publishDate" in content ? content.publishDate ?? null : null,
    seo: content.seo ?? null,
    slug: content.slug,
    status: (post ? content._status : content.workflowStatus ?? content._status) ?? null,
    title: content.title,
    type: post ? "post" : "page",
    websiteId: "websiteId" in content ? content.websiteId : null,
  };
}

export function buildMetadata({ content, pathname, settings }: BuildMetadataInput): Metadata {
  const normalized = normalizeSeoMetadata({
    content: toSeoResource(content),
    path: pathname,
    website: getWebsiteSeoDefaults(settings),
  });

  return {
    alternates: normalized.canonicalUrl ? { canonical: normalized.canonicalUrl } : undefined,
    description: normalized.description ?? undefined,
    metadataBase: new URL(websiteBaseUrl),
    openGraph: {
      description: normalized.openGraph.description ?? undefined,
      images: normalized.openGraph.image ? [{ url: normalized.openGraph.image }] : undefined,
      locale: normalized.locale ?? undefined,
      siteName: normalized.openGraph.siteName ?? undefined,
      title: normalized.openGraph.title,
      type: normalized.openGraph.type,
      url: normalized.openGraph.url ?? undefined,
    },
    robots: normalized.robots,
    title: normalized.title,
    twitter: {
      card: normalized.twitter.card,
      description: normalized.twitter.description ?? undefined,
      images: normalized.twitter.image ? [normalized.twitter.image] : undefined,
      title: normalized.twitter.title,
    },
  };
}

function jsonLdImage(value: PayloadPage["featuredImage"]): string | undefined {
  return getMediaUrl(value) ?? undefined;
}

function safeJsonLd(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function getFaqSchema(content: PayloadPage | PayloadPost): Record<string, unknown> | null {
  const layout = "layout" in content ? content.layout : null;
  if (!Array.isArray(layout)) return null;

  const questions = layout.flatMap((block) => {
    if (!block || typeof block !== "object") return [];
    const record = block as Record<string, unknown>;
    const type = record.blockType ?? record.type;
    if (type !== "faq") return [];
    const items = Array.isArray(record.items) ? record.items : [];

    return items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const question = (item as { question?: unknown }).question;
      const answer = (item as { answer?: unknown }).answer;
      return typeof question === "string" && typeof answer === "string" && question.trim() && answer.trim()
        ? [
            {
              "@type": "Question",
              acceptedAnswer: { "@type": "Answer", text: answer },
              name: question,
            },
          ]
        : [];
    });
  });

  return questions.length > 0 ? { "@type": "FAQPage", mainEntity: questions } : null;
}

export function buildStructuredData({
  content,
  pathname,
  settings,
}: BuildMetadataInput & { content: PayloadPage | PayloadPost }): Record<string, unknown>[] {
  const resource = toSeoResource(content);
  const website = getWebsiteSeoDefaults(settings);
  const normalized = normalizeSeoMetadata({ content: resource, path: pathname, website });
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      name: website.siteName ?? normalized.title,
      url: website.canonicalBaseUrl ?? websiteBaseUrl,
    },
    {
      "@type": "WebSite",
      name: website.siteName ?? normalized.title,
      url: website.canonicalBaseUrl ?? websiteBaseUrl,
    },
    {
      "@type": resource?.type === "post" ? "Article" : "WebPage",
      dateModified: resource?.updatedAt,
      datePublished: resource?.publishedAt,
      description: normalized.description ?? undefined,
      headline: normalized.title,
      image: jsonLdImage(content.featuredImage),
      mainEntityOfPage: normalized.canonicalUrl ?? undefined,
      name: normalized.title,
      url: normalized.canonicalUrl ?? undefined,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", item: website.canonicalBaseUrl ?? websiteBaseUrl, name: "Home", position: 1 },
        { "@type": "ListItem", item: normalized.canonicalUrl ?? pathname, name: content.title, position: 2 },
      ],
    },
  ];
  const faqSchema = getFaqSchema(content);
  if (faqSchema) graph.push(faqSchema);

  return graph.map(safeJsonLd);
}

export function getImageAlt(value: unknown): string | null {
  const media = value as PayloadPage["featuredImage"];
  return isMedia(media) ? getMediaAlt(media) : null;
}

export { getWebsiteSeoDefaults, normalizeSeoMetadata, resolveCanonicalUrl, toSeoResource };
