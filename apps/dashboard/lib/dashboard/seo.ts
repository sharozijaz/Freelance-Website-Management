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
import { mediaAssets, organizations, pages, posts, websites } from "@agency/database/schema";
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

function websiteCanonicalBase(row: {
  primaryDomain: string | null;
  productionUrl: string | null;
}) {
  if (row.productionUrl) return row.productionUrl;
  if (row.primaryDomain) return `https://${row.primaryDomain}`;
  return null;
}

function websiteDefaults(row: {
  id: string;
  name: string;
  primaryDomain: string | null;
  productionUrl: string | null;
}): WebsiteSeoDefaults & { id: string } {
  return {
    canonicalBaseUrl: websiteCanonicalBase(row),
    id: row.id,
    siteName: row.name,
    siteTitle: row.name,
    titleTemplate: `%s | ${row.name}`,
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

function addActions(findings: SeoFinding[], cmsBaseUrl: string) {
  return findings.map((finding) => ({
    ...finding,
    actionHref:
      finding.resourceType === "media"
        ? `${cmsBaseUrl}/admin/collections/media/${finding.resourceId}`
        : `${cmsBaseUrl}/admin/collections/${finding.resourceType === "post" ? "posts" : "pages"}/${finding.resourceId}`,
    cmsEditHref:
      finding.resourceType === "media"
        ? `${cmsBaseUrl}/admin/collections/media/${finding.resourceId}`
        : `${cmsBaseUrl}/admin/collections/${finding.resourceType === "post" ? "posts" : "pages"}/${finding.resourceId}`,
  }));
}

export async function getSeoOperations({
  cmsBaseUrl = process.env.NEXT_PUBLIC_CMS_URL ?? "http://localhost:3001",
  database,
  params,
  request,
}: {
  cmsBaseUrl?: string;
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

  const [pageRows, postRows, mediaRows] = await Promise.all([
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
  ]);

  const findings = websiteRows.flatMap((website) => {
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
    const contentFindings = runSeoRules({ resources, website: websiteDefaults(website) });
    const mediaFindings = mediaRows
      .filter((asset) => asset.websiteId === website.id)
      .filter((asset) => asset.mimeType.startsWith("image/") && !asset.altText?.trim())
      .map((asset) => ({
        description: `${asset.filename} is missing alt text.`,
        recommendedAction: "Open the media asset in Payload CMS and add descriptive alt text.",
        resourceId: asset.id,
        resourceTitle: asset.filename,
        resourceType: "media" as const,
        ruleId: "image_missing_alt",
        severity: "warning" as const,
        title: "Image missing alt text",
        websiteId: website.id,
      }));

    return addActions([...contentFindings, ...mediaFindings], cmsBaseUrl);
  });

  const filtered = findings
    .filter((finding) => params.severity && params.severity !== "all" ? finding.severity === params.severity : true)
    .filter((finding) => params.resourceType && params.resourceType !== "all" ? finding.resourceType === params.resourceType : true)
    .filter((finding) => params.ruleId && params.ruleId !== "all" ? finding.ruleId === params.ruleId : true)
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const summaries: SeoWebsiteSummary[] = websiteRows.map((website) => {
    const websiteFindings = findings.filter((finding) => finding.websiteId === website.id);
    return {
      errors: websiteFindings.filter((finding) => finding.severity === "error").length,
      findings: websiteFindings.length,
      organizationId: website.organizationId,
      organizationName: website.organizationName,
      recommendations: websiteFindings.filter((finding) => finding.severity === "recommendation").length,
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
  return getSeoOperations({
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
}

export function getNormalizedPreview(resource: SeoContentResource, website: WebsiteSeoDefaults) {
  return normalizeSeoMetadata({ content: resource, path: contentPath(resource), website });
}
