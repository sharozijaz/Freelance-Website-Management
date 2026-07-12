export type SeoResourceType = "media" | "page" | "post" | "website";
export type SeoFindingSeverity = "error" | "recommendation" | "warning";

export interface SeoImage {
  alt?: string | null;
  id?: string;
  url?: string | null;
}

export interface SeoOverrides {
  canonicalUrl?: string | null;
  metaDescription?: string | null;
  metaTitle?: string | null;
  openGraph?: {
    description?: string | null;
    title?: string | null;
    type?: "article" | "website";
  } | null;
  robots?: {
    follow?: boolean | null;
    index?: boolean | null;
  } | null;
  schema?: Record<string, unknown> | null;
  socialImage?: SeoImage | string | null;
  twitterCard?: "summary" | "summary_large_image" | null;
  twitterDescription?: string | null;
  twitterImage?: SeoImage | string | null;
  twitterTitle?: string | null;
}

export interface WebsiteSeoDefaults {
  canonicalBaseUrl?: string | null;
  defaultMetaDescription?: string | null;
  defaultOgImage?: SeoImage | string | null;
  defaultRobots?: {
    follow?: boolean | null;
    index?: boolean | null;
  } | null;
  locale?: string | null;
  siteName?: string | null;
  siteTitle?: string | null;
  titleTemplate?: string | null;
}

export interface SeoContentResource {
  authorName?: string | null;
  blocks?: unknown[] | null;
  excerpt?: string | null;
  featuredImage?: SeoImage | string | null;
  id: string;
  organizationId?: string;
  publishedAt?: Date | string | null;
  seo?: SeoOverrides | null;
  slug: string;
  status?: string | null;
  title: string;
  type: "page" | "post";
  updatedAt?: Date | string | null;
  websiteId?: string | null;
}

export interface NormalizedSeoMetadata {
  canonicalUrl: string | null;
  description: string | null;
  locale: string | null;
  openGraph: {
    description: string | null;
    image: string | null;
    siteName: string | null;
    title: string;
    type: "article" | "website";
    url: string | null;
  };
  robots: {
    follow: boolean;
    index: boolean;
  };
  siteName: string | null;
  socialImage: string | null;
  title: string;
  twitter: {
    card: "summary" | "summary_large_image";
    description: string | null;
    image: string | null;
    title: string;
  };
}

export interface SeoFinding {
  actionHref?: string;
  cmsEditHref?: string;
  description: string;
  recommendedAction: string;
  resourceId: string;
  resourceTitle: string;
  resourceType: SeoResourceType;
  ruleId: string;
  severity: SeoFindingSeverity;
  title: string;
  websiteId: string;
}

export const seoRuleThresholds = {
  metaDescriptionMax: 160,
  metaDescriptionMin: 50,
  titleMax: 60,
  titleMin: 30,
};

function cleanString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function imageUrl(value: SeoImage | string | null | undefined): string | null {
  if (typeof value === "string") return cleanString(value);
  if (isRecord(value) && typeof value.url === "string") return cleanString(value.url);
  return null;
}

export function applyTitleTemplate(title: string, template?: string | null): string {
  const safeTemplate = cleanString(template);
  if (!safeTemplate) return title;
  return safeTemplate.includes("%s") ? safeTemplate.replace("%s", title) : `${title} | ${safeTemplate}`;
}

export function resolveCanonicalUrl({
  baseUrl,
  explicitCanonical,
  path,
}: {
  baseUrl?: string | null | undefined;
  explicitCanonical?: string | null | undefined;
  path: string;
}): string | null {
  const explicit = cleanString(explicitCanonical);

  if (explicit) {
    if (explicit.startsWith("/") && !explicit.startsWith("//")) {
      return resolveCanonicalUrl({ baseUrl, path: explicit });
    }

    try {
      const url = new URL(explicit);
      return url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  const cleanBase = cleanString(baseUrl);
  if (!cleanBase) return null;

  try {
    const base = new URL(cleanBase);
    if (!["http:", "https:"].includes(base.protocol)) return null;
    return new URL(path.startsWith("/") ? path : `/${path}`, base).toString();
  } catch {
    return null;
  }
}

export function resolveWebsiteCanonicalBase({
  fallbackBaseUrl,
  primaryDomain,
  productionUrl,
}: {
  fallbackBaseUrl?: string | null;
  primaryDomain?: string | null;
  productionUrl?: string | null;
}): string | null {
  const domain = cleanString(primaryDomain);
  if (domain) {
    return resolveCanonicalUrl({ baseUrl: `https://${domain}`, path: "/" })?.replace(/\/$/, "") ?? null;
  }

  const deployedUrl = cleanString(productionUrl);
  if (deployedUrl) {
    return resolveCanonicalUrl({ baseUrl: deployedUrl, path: "/" })?.replace(/\/$/, "") ?? null;
  }

  const fallback = cleanString(fallbackBaseUrl);
  if (!fallback) return null;
  return resolveCanonicalUrl({ baseUrl: fallback, path: "/" })?.replace(/\/$/, "") ?? null;
}

export function normalizeSeoMetadata({
  content,
  path,
  website,
}: {
  content?: SeoContentResource | null;
  path: string;
  website: WebsiteSeoDefaults;
}): NormalizedSeoMetadata {
  const seo = content?.seo;
  const fallbackTitle = cleanString(content?.title) ?? cleanString(website.siteTitle) ?? "Website";
  const title = cleanString(seo?.metaTitle) ?? applyTitleTemplate(fallbackTitle, website.titleTemplate);
  const description =
    cleanString(seo?.metaDescription) ??
    cleanString(content?.excerpt) ??
    cleanString(website.defaultMetaDescription);
  const canonicalUrl = resolveCanonicalUrl({
    baseUrl: website.canonicalBaseUrl,
    explicitCanonical: seo?.canonicalUrl,
    path,
  });
  const socialImage =
    imageUrl(seo?.twitterImage) ??
    imageUrl(seo?.socialImage) ??
    imageUrl(content?.featuredImage) ??
    imageUrl(website.defaultOgImage);
  const index = seo?.robots?.index ?? website.defaultRobots?.index ?? true;
  const follow = seo?.robots?.follow ?? website.defaultRobots?.follow ?? true;
  const ogTitle = cleanString(seo?.openGraph?.title) ?? title;
  const ogDescription = cleanString(seo?.openGraph?.description) ?? description;
  const twitterTitle = cleanString(seo?.twitterTitle) ?? ogTitle;
  const twitterDescription = cleanString(seo?.twitterDescription) ?? ogDescription;

  return {
    canonicalUrl,
    description,
    locale: cleanString(website.locale),
    openGraph: {
      description: ogDescription,
      image: socialImage,
      siteName: cleanString(website.siteName),
      title: ogTitle,
      type: seo?.openGraph?.type ?? (content?.type === "post" ? "article" : "website"),
      url: canonicalUrl,
    },
    robots: { follow, index },
    siteName: cleanString(website.siteName),
    socialImage,
    title,
    twitter: {
      card: seo?.twitterCard ?? "summary_large_image",
      description: twitterDescription,
      image: socialImage,
      title: twitterTitle,
    },
  };
}

function finding(input: Omit<SeoFinding, "recommendedAction" | "title"> & {
  recommendedAction?: string;
  title?: string;
}): SeoFinding {
  return {
    ...input,
    recommendedAction: input.recommendedAction ?? "Open the resource in Payload CMS and update SEO metadata.",
    title: input.title ?? input.description,
  };
}

export function countDetectableH1(blocks?: unknown[] | null): number | null {
  if (!blocks) return null;

  return blocks.filter((block) => {
    if (!isRecord(block)) return false;
    const type = block.type ?? block.blockType;
    const content = isRecord(block.content) ? block.content : block;
    return type === "hero" && typeof content.headline === "string" && content.headline.trim();
  }).length;
}

export function runSeoRules({
  resources,
  website,
}: {
  resources: SeoContentResource[];
  website: WebsiteSeoDefaults & { id: string };
}): SeoFinding[] {
  const findings: SeoFinding[] = [];
  const titleMap = new Map<string, SeoContentResource[]>();
  const descriptionMap = new Map<string, SeoContentResource[]>();
  const slugMap = new Map<string, SeoContentResource[]>();

  for (const resource of resources) {
    const path = resource.type === "post" ? `/blog/${resource.slug}` : resource.slug === "home" ? "/" : `/${resource.slug}`;
    const normalized = normalizeSeoMetadata({ content: resource, path, website });
    const isPublished = resource.status === "published" || resource.status === undefined;

    titleMap.set(normalized.title, [...(titleMap.get(normalized.title) ?? []), resource]);
    if (normalized.description) {
      descriptionMap.set(normalized.description, [
        ...(descriptionMap.get(normalized.description) ?? []),
        resource,
      ]);
    }
    slugMap.set(resource.slug, [...(slugMap.get(resource.slug) ?? []), resource]);

    const base = {
      resourceId: resource.id,
      resourceTitle: resource.title,
      resourceType: resource.type,
      websiteId: resource.websiteId ?? website.id,
    } satisfies Pick<SeoFinding, "resourceId" | "resourceTitle" | "resourceType" | "websiteId">;

    if (!cleanString(resource.seo?.metaTitle)) {
      findings.push(finding({ ...base, description: `${resource.title} is missing an explicit SEO title.`, ruleId: "missing_seo_title", severity: "warning" }));
    }
    if (normalized.title.length < seoRuleThresholds.titleMin) {
      findings.push(finding({ ...base, description: "SEO title is shorter than the configured threshold.", ruleId: "seo_title_too_short", severity: "recommendation" }));
    }
    if (normalized.title.length > seoRuleThresholds.titleMax) {
      findings.push(finding({ ...base, description: "SEO title is longer than the configured threshold.", ruleId: "seo_title_too_long", severity: "warning" }));
    }
    if (!normalized.description) {
      findings.push(finding({ ...base, description: `${resource.title} is missing a meta description.`, ruleId: "missing_meta_description", severity: "warning" }));
    } else if (normalized.description.length < seoRuleThresholds.metaDescriptionMin) {
      findings.push(finding({ ...base, description: "Meta description is shorter than the configured threshold.", ruleId: "meta_description_too_short", severity: "recommendation" }));
    } else if (normalized.description.length > seoRuleThresholds.metaDescriptionMax) {
      findings.push(finding({ ...base, description: "Meta description is longer than the configured threshold.", ruleId: "meta_description_too_long", severity: "warning" }));
    }
    if (!normalized.canonicalUrl) {
      findings.push(finding({ ...base, description: `${resource.title} does not resolve to a valid canonical URL.`, ruleId: "missing_canonical_url", severity: "error" }));
    } else if (resource.seo?.canonicalUrl && !resolveCanonicalUrl({ explicitCanonical: resource.seo.canonicalUrl, path })) {
      findings.push(finding({ ...base, description: "Canonical override is malformed or unsafe.", ruleId: "invalid_canonical_url", severity: "error" }));
    }
    if (isPublished && !normalized.robots.index) {
      findings.push(finding({ ...base, description: "Published content is marked noindex.", ruleId: "published_noindex", severity: "error" }));
    }
    if (!normalized.socialImage) {
      findings.push(finding({ ...base, description: "Open Graph image is missing.", ruleId: "missing_open_graph_image", severity: "recommendation" }));
    }
    const h1Count = countDetectableH1(resource.blocks);
    if (h1Count === 0) {
      findings.push(finding({ ...base, description: "No detectable page H1 was found in supported block content.", ruleId: "missing_h1", severity: "warning" }));
    } else if (h1Count && h1Count > 1) {
      findings.push(finding({ ...base, description: "Multiple detectable H1 headings were found.", ruleId: "multiple_h1", severity: "warning" }));
    }
    if (resource.type === "page" && Array.isArray(resource.blocks) && resource.blocks.length === 0) {
      findings.push(finding({ ...base, description: "Page content is empty.", ruleId: "empty_page_content", severity: "error" }));
    }
  }

  for (const [slug, duplicates] of slugMap) {
    if (duplicates.length > 1) {
      for (const resource of duplicates) {
        findings.push(finding({
          description: `Duplicate slug "${slug}" exists within this website.`,
          resourceId: resource.id,
          resourceTitle: resource.title,
          resourceType: resource.type,
          ruleId: "duplicate_slug",
          severity: "error",
          websiteId: resource.websiteId ?? website.id,
        }));
      }
    }
  }

  for (const [title, duplicates] of titleMap) {
    if (duplicates.length > 1) {
      for (const resource of duplicates) {
        findings.push(finding({
          description: `Duplicate SEO title "${title}" exists within this website.`,
          resourceId: resource.id,
          resourceTitle: resource.title,
          resourceType: resource.type,
          ruleId: "duplicate_seo_title",
          severity: "warning",
          websiteId: resource.websiteId ?? website.id,
        }));
      }
    }
  }

  for (const [description, duplicates] of descriptionMap) {
    if (duplicates.length > 1) {
      for (const resource of duplicates) {
        findings.push(finding({
          description: `Duplicate meta description "${description}" exists within this website.`,
          resourceId: resource.id,
          resourceTitle: resource.title,
          resourceType: resource.type,
          ruleId: "duplicate_meta_description",
          severity: "warning",
          websiteId: resource.websiteId ?? website.id,
        }));
      }
    }
  }

  return findings;
}
