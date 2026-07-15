import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import {
  normalizeSeoMetadata,
  runSeoRules,
  type SeoContentResource,
  type SeoFinding,
  type SeoFindingSeverity,
  type WebsiteSeoDefaults,
} from "@agency/lib/seo";
import type { createDatabaseClient } from "@agency/database";
import {
  auditLogs,
  mediaAssets,
  organizations,
  pages,
  posts,
  seoMetadata,
  websites,
} from "@agency/database/schema";
import { assertDashboardPermission, getScopedOrganizationIds } from "./access";
import type { DashboardRequest, DashboardSearchParams } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

export interface SeoWebsiteSummary {
  errors: number;
  findings: number;
  organizationId: string;
  organizationName: string;
  recommendations: number;
  warnings: number;
  websiteId: string;
  websiteName: string;
}

export interface WebsiteSeoSettings {
  canonicalBaseUrl: string | null;
  defaultMetaDescription: string | null;
  defaultOgImage: string | null;
  robotsFollow: boolean;
  robotsIndex: boolean;
  siteTitle: string | null;
  socialImage: string | null;
  titleTemplate: string | null;
  twitterCard: "summary" | "summary_large_image";
}

export const defaultWebsiteSeoSettings: WebsiteSeoSettings = {
  canonicalBaseUrl: null,
  defaultMetaDescription: null,
  defaultOgImage: null,
  robotsFollow: true,
  robotsIndex: true,
  siteTitle: null,
  socialImage: null,
  titleTemplate: null,
  twitterCard: "summary_large_image",
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function optionalUrl(value: unknown): string | null {
  const text = optionalString(value);
  if (!text) return null;

  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function boolSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseWebsiteSeoSettings(value: Record<string, unknown> | null | undefined) {
  return {
    canonicalBaseUrl: optionalUrl(value?.canonicalBaseUrl),
    defaultMetaDescription: optionalString(value?.defaultMetaDescription),
    defaultOgImage: optionalUrl(value?.defaultOgImage),
    robotsFollow: boolSetting(value?.robotsFollow, defaultWebsiteSeoSettings.robotsFollow),
    robotsIndex: boolSetting(value?.robotsIndex, defaultWebsiteSeoSettings.robotsIndex),
    siteTitle: optionalString(value?.siteTitle),
    socialImage: optionalUrl(value?.socialImage),
    titleTemplate: optionalString(value?.titleTemplate),
    twitterCard:
      value?.twitterCard === "summary" || value?.twitterCard === "summary_large_image"
        ? value.twitterCard
        : defaultWebsiteSeoSettings.twitterCard,
  } satisfies WebsiteSeoSettings;
}

function settingsMetadata(settings: WebsiteSeoSettings): Record<string, unknown> {
  return {
    canonicalBaseUrl: settings.canonicalBaseUrl,
    defaultMetaDescription: settings.defaultMetaDescription,
    defaultOgImage: settings.defaultOgImage,
    robotsFollow: settings.robotsFollow,
    robotsIndex: settings.robotsIndex,
    siteTitle: settings.siteTitle,
    socialImage: settings.socialImage,
    titleTemplate: settings.titleTemplate,
    twitterCard: settings.twitterCard,
  };
}

function websiteCanonicalBase(row: { primaryDomain: string | null; productionUrl: string | null }) {
  if (row.productionUrl) return row.productionUrl;
  if (row.primaryDomain) return `https://${row.primaryDomain}`;
  return null;
}

function websiteDefaults(row: {
  id: string;
  name: string;
  primaryDomain: string | null;
  productionUrl: string | null;
  seoSettings?: WebsiteSeoSettings;
}): WebsiteSeoDefaults & { id: string } {
  const settings = row.seoSettings ?? defaultWebsiteSeoSettings;

  return {
    canonicalBaseUrl: settings.canonicalBaseUrl ?? websiteCanonicalBase(row),
    defaultMetaDescription: settings.defaultMetaDescription,
    defaultOgImage: settings.defaultOgImage ?? settings.socialImage,
    defaultRobots: { follow: settings.robotsFollow, index: settings.robotsIndex },
    id: row.id,
    siteName: row.name,
    siteTitle: settings.siteTitle ?? row.name,
    titleTemplate: settings.titleTemplate ?? `%s | ${row.name}`,
  };
}

function severityRank(severity: SeoFindingSeverity) {
  return severity === "error" ? 0 : severity === "warning" ? 1 : 2;
}

function contentPath(resource: SeoContentResource) {
  return resource.type === "post"
    ? `/blog/${resource.slug}`
    : resource.slug === "home"
      ? "/"
      : `/${resource.slug}`;
}

export function getSeoActionHref(
  finding: Pick<SeoFinding, "resourceId" | "resourceType" | "websiteId">,
) {
  if (finding.resourceType === "post") {
    return `/websites/${finding.websiteId}/blog/${finding.resourceId}`;
  }

  if (finding.resourceType === "media") {
    return `/websites/${finding.websiteId}/media`;
  }

  if (finding.resourceType === "website") {
    return `/websites/${finding.websiteId}/seo`;
  }

  return `/websites/${finding.websiteId}`;
}

function addActions(findings: SeoFinding[]) {
  return findings.map((finding) => ({
    ...finding,
    actionHref: getSeoActionHref(finding),
  }));
}

function websiteFindings(row: {
  id: string;
  name: string;
  primaryDomain: string | null;
  productionUrl: string | null;
  seoSettings: WebsiteSeoSettings;
}): SeoFinding[] {
  const base = {
    resourceId: row.id,
    resourceTitle: row.name,
    resourceType: "website" as const,
    websiteId: row.id,
  };
  const findings: SeoFinding[] = [];

  if (!row.primaryDomain) {
    findings.push({
      ...base,
      description: "This website has no primary production domain.",
      recommendedAction: "Open Domains and mark a verified production domain as primary.",
      ruleId: "missing_primary_domain",
      severity: "warning",
      title: "Primary domain missing",
    });
  }

  if (!row.productionUrl) {
    findings.push({
      ...base,
      description: "This website has no production URL stored.",
      recommendedAction: "Open Hosting or Launch and record the live production URL.",
      ruleId: "missing_production_url",
      severity: "warning",
      title: "Production URL missing",
    });
  }

  if (!row.seoSettings.defaultMetaDescription) {
    findings.push({
      ...base,
      description: "No default meta description is configured for this website.",
      recommendedAction: "Add a default meta description in Website SEO settings.",
      ruleId: "missing_default_meta_description",
      severity: "recommendation",
      title: "Default meta description missing",
    });
  }

  if (!row.seoSettings.defaultOgImage && !row.seoSettings.socialImage) {
    findings.push({
      ...base,
      description: "No default social image is configured for Open Graph or Twitter cards.",
      recommendedAction: "Add a default social image URL in Website SEO settings.",
      ruleId: "missing_default_social_image",
      severity: "recommendation",
      title: "Default social image missing",
    });
  }

  return addActions(findings);
}

export async function getSeoOperations({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams & {
    resourceType?: string;
    ruleId?: string;
    severity?: string;
    websiteId?: string;
  };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "cms:read", params.organizationId);
  const scopedOrgIds = getScopedOrganizationIds(request);
  const websiteConditions = [
    isNull(websites.deletedAt),
    params.organizationId ? eq(websites.organizationId, params.organizationId) : undefined,
    params.websiteId ? eq(websites.id, params.websiteId) : undefined,
    scopedOrgIds ? inArray(websites.organizationId, scopedOrgIds) : undefined,
    params.query ? ilike(websites.name, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const websiteRows = await database
    .select({
      id: websites.id,
      name: websites.name,
      organizationId: websites.organizationId,
      organizationName: organizations.name,
      primaryDomain: websites.primaryDomain,
      productionUrl: websites.productionUrl,
    })
    .from(websites)
    .innerJoin(organizations, eq(websites.organizationId, organizations.id))
    .where(and(...websiteConditions))
    .orderBy(desc(websites.updatedAt))
    .limit(50);

  const websiteIds = websiteRows.map((website) => website.id);
  if (websiteIds.length === 0) {
    return { findings: [], summaries: [] };
  }

  const [pageRows, postRows, mediaRows, seoRows] = await Promise.all([
    database
      .select()
      .from(pages)
      .where(and(isNull(pages.deletedAt), inArray(pages.websiteId, websiteIds))),
    database
      .select()
      .from(posts)
      .where(and(isNull(posts.deletedAt), inArray(posts.websiteId, websiteIds))),
    database
      .select()
      .from(mediaAssets)
      .where(and(isNull(mediaAssets.deletedAt), inArray(mediaAssets.websiteId, websiteIds))),
    database
      .select()
      .from(seoMetadata)
      .where(
        and(eq(seoMetadata.resourceType, "website"), inArray(seoMetadata.websiteId, websiteIds)),
      ),
  ]);
  const seoSettingsMap = new Map(
    seoRows.map((row) => [row.websiteId, parseWebsiteSeoSettings(row.metadata)]),
  );

  const findings = websiteRows.flatMap((website) => {
    const seoSettings = seoSettingsMap.get(website.id) ?? defaultWebsiteSeoSettings;
    const websiteWithSeo = { ...website, seoSettings };
    const resources: SeoContentResource[] = [
      ...pageRows
        .filter((page) => page.websiteId === website.id)
        .map((page) => ({
          blocks: null,
          id: page.id,
          organizationId: page.organizationId,
          slug: page.slug,
          status: page.status,
          title: page.title,
          type: "page" as const,
          updatedAt: page.updatedAt,
          websiteId: page.websiteId,
        })),
      ...postRows
        .filter((post) => post.websiteId === website.id)
        .map((post) => ({
          id: post.id,
          organizationId: post.organizationId,
          publishedAt: post.publishedAt,
          slug: post.slug,
          status: post.status,
          title: post.title,
          type: "post" as const,
          updatedAt: post.updatedAt,
          websiteId: post.websiteId,
        })),
    ];
    const contentFindings = runSeoRules({
      resources,
      website: websiteDefaults(websiteWithSeo),
    });
    const mediaFindings = mediaRows
      .filter((asset) => asset.websiteId === website.id)
      .filter((asset) => asset.mimeType.startsWith("image/") && !asset.altText?.trim())
      .map((asset) => ({
        description: `${asset.filename} is missing alt text.`,
        recommendedAction: "Open the website media manager and add descriptive alt text.",
        resourceId: asset.id,
        resourceTitle: asset.filename,
        resourceType: "media" as const,
        ruleId: "image_missing_alt",
        severity: "warning" as const,
        title: "Image missing alt text",
        websiteId: website.id,
      }));

    return [
      ...websiteFindings(websiteWithSeo),
      ...addActions([...contentFindings, ...mediaFindings]),
    ];
  });

  const filtered = findings
    .filter((finding) =>
      params.severity && params.severity !== "all" ? finding.severity === params.severity : true,
    )
    .filter((finding) =>
      params.resourceType && params.resourceType !== "all"
        ? finding.resourceType === params.resourceType
        : true,
    )
    .filter((finding) =>
      params.ruleId && params.ruleId !== "all" ? finding.ruleId === params.ruleId : true,
    )
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const summaries: SeoWebsiteSummary[] = websiteRows.map((website) => {
    const websiteFindings = findings.filter((finding) => finding.websiteId === website.id);
    return {
      errors: websiteFindings.filter((finding) => finding.severity === "error").length,
      findings: websiteFindings.length,
      organizationId: website.organizationId,
      organizationName: website.organizationName,
      recommendations: websiteFindings.filter((finding) => finding.severity === "recommendation")
        .length,
      warnings: websiteFindings.filter((finding) => finding.severity === "warning").length,
      websiteId: website.id,
      websiteName: website.name,
    };
  });

  return { findings: filtered, summaries };
}

export async function getWebsiteSeoOperations(input: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const result = await getSeoOperations({
    database: input.database,
    params: {
      page: 1,
      query: "",
      resourceType: "all",
      ruleId: "all",
      severity: "all",
      sort: "updated_desc",
      status: "all",
      websiteId: input.websiteId,
    },
    request: input.request,
  });
  const website = await input.database.query.websites.findFirst({
    where: and(eq(websites.id, input.websiteId), isNull(websites.deletedAt)),
  });

  const row = await input.database.query.seoMetadata.findFirst({
    where: and(
      eq(seoMetadata.websiteId, input.websiteId),
      eq(seoMetadata.resourceType, "website"),
      eq(seoMetadata.resourceId, input.websiteId),
    ),
  });

  return {
    ...result,
    settings: parseWebsiteSeoSettings(row?.metadata),
    website,
  };
}

export function getNormalizedPreview(resource: SeoContentResource, website: WebsiteSeoDefaults) {
  return normalizeSeoMetadata({ content: resource, path: contentPath(resource), website });
}

export async function updateWebsiteSeoSettings({
  database,
  input,
  request,
  websiteId,
}: {
  database: Database;
  input: WebsiteSeoSettings;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await database.query.websites.findFirst({
    where: and(eq(websites.id, websiteId), isNull(websites.deletedAt)),
  });

  if (!website) {
    throw new Error("Website was not found.");
  }

  assertDashboardPermission(request, "cms:write", website.organizationId);

  const metadata = settingsMetadata(input);
  const now = new Date();
  const existing = await database.query.seoMetadata.findFirst({
    where: and(
      eq(seoMetadata.websiteId, websiteId),
      eq(seoMetadata.resourceType, "website"),
      eq(seoMetadata.resourceId, websiteId),
    ),
  });

  if (existing) {
    await database
      .update(seoMetadata)
      .set({ metadata, updatedAt: now })
      .where(eq(seoMetadata.id, existing.id));
  } else {
    await database.insert(seoMetadata).values({
      metadata,
      organizationId: website.organizationId,
      resourceId: website.id,
      resourceType: "website",
      websiteId: website.id,
    });
  }

  await database.insert(auditLogs).values({
    action: "seo.settings_updated",
    actorUserId: request.context.user.id,
    metadata: { websiteId },
    organizationId: website.organizationId,
    resourceId: website.id,
    resourceType: "website",
  });
}
