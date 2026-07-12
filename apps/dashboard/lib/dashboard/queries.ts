import { and, asc, count, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import {
  auditLogs,
  invitations,
  mediaAssets,
  memberships,
  organizations,
  pages,
  posts,
  projects,
  websites,
} from "@agency/database/schema";
import { listAccessibleOrganizations } from "@agency/auth/organizations";
import type { DashboardSearchParams } from "./types";
import {
  assertAgencyOperationsAccess,
  assertDashboardPermission,
  getScopedOrganizationIds,
} from "./access";
import type { DashboardRequest } from "./types";
import { getPagination } from "./filters";
import { presentAuditLog } from "./activity";
import {
  getContentAttentionItems,
  getInvitationAttentionItems,
  getMediaAttentionItems,
  getOrganizationAttentionItems,
  getProjectAttentionItems,
  getWebsiteAttentionItems,
} from "./attention";

type Database = ReturnType<typeof createDatabaseClient>;

function organizationScopeCondition(request: DashboardRequest, column = organizations.id) {
  const ids = getScopedOrganizationIds(request);

  if (ids === null) {
    return undefined;
  }

  if (ids.length === 0) {
    return sql`false`;
  }

  return inArray(column, ids);
}

function activeOrganizationCondition(request: DashboardRequest, organizationId?: string) {
  const requestedOrganizationId = organizationId ?? request.access.activeOrganizationId ?? undefined;
  const scope = getScopedOrganizationIds(request);

  if (requestedOrganizationId) {
    if (scope !== null && !scope.includes(requestedOrganizationId)) {
      return sql`false`;
    }

    return eq(organizations.id, requestedOrganizationId);
  }

  return organizationScopeCondition(request);
}

export async function getDashboardShellData({
  database,
  request,
}: {
  database: Database;
  request: DashboardRequest;
}) {
  const accessibleOrganizations = await listAccessibleOrganizations({
    context: request.context,
    database,
  });
  const activeOrganization =
    accessibleOrganizations.find(
      (organization) => organization.id === request.access.activeOrganizationId,
    ) ?? null;

  return {
    accessibleOrganizations,
    activeOrganization,
  };
}

export async function getAgencyOverview({
  database,
  request,
}: {
  database: Database;
  request: DashboardRequest;
}) {
  assertAgencyOperationsAccess(request);

  const orgScope = organizationScopeCondition(request);
  const scopedOrgIds = getScopedOrganizationIds(request);
  const orgConditions = [isNull(organizations.deletedAt), orgScope].filter(Boolean);
  const websiteConditions = [
    isNull(websites.deletedAt),
    scopedOrgIds ? inArray(websites.organizationId, scopedOrgIds) : undefined,
  ].filter(Boolean);
  const pageConditions = [
    isNull(pages.deletedAt),
    scopedOrgIds ? inArray(pages.organizationId, scopedOrgIds) : undefined,
  ].filter(Boolean);
  const postConditions = [
    isNull(posts.deletedAt),
    scopedOrgIds ? inArray(posts.organizationId, scopedOrgIds) : undefined,
  ].filter(Boolean);
  const invitationConditions = [
    isNull(invitations.deletedAt),
    scopedOrgIds ? inArray(invitations.organizationId, scopedOrgIds) : undefined,
  ].filter(Boolean);

  const projectConditions = [
    isNull(projects.deletedAt),
    scopedOrgIds ? inArray(projects.organizationId, scopedOrgIds) : undefined,
  ].filter(Boolean);

  const [[clientCount], [websiteCount], [projectCount], [draftPages], [draftPosts], [pendingInvitations]] =
    await Promise.all([
      database
        .select({ value: count() })
        .from(organizations)
        .where(and(...orgConditions, eq(organizations.status, "active"))),
      database.select({ value: count() }).from(websites).where(and(...websiteConditions)),
      database.select({ value: count() }).from(projects).where(and(...projectConditions)),
      database
        .select({ value: count() })
        .from(pages)
        .where(and(...pageConditions, eq(pages.status, "draft"))),
      database
        .select({ value: count() })
        .from(posts)
        .where(and(...postConditions, eq(posts.status, "draft"))),
      database
        .select({ value: count() })
        .from(invitations)
        .where(and(...invitationConditions, eq(invitations.status, "pending"))),
    ]);

  const [recentWebsites, recentActivity, attention] = await Promise.all([
    getWebsites({ database, request, params: { page: 1, query: "", sort: "updated_desc", status: "all" } }),
    getRecentActivity({ database, request, limit: 8 }),
    getAttentionItems({ database, request }),
  ]);

  return {
    attention,
    draftContent: (draftPages?.value ?? 0) + (draftPosts?.value ?? 0),
    activeClients: clientCount?.value ?? 0,
    activeProjects: projectCount?.value ?? 0,
    managedWebsites: websiteCount?.value ?? 0,
    pendingInvitations: pendingInvitations?.value ?? 0,
    recentActivity,
    recentWebsites: recentWebsites.items.slice(0, 5),
  };
}

export async function getClients({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams;
  request: DashboardRequest;
}) {
  assertAgencyOperationsAccess(request);
  const { limit, offset } = getPagination(params);
  const conditions = [
    isNull(organizations.deletedAt),
    organizationScopeCondition(request),
    params.status !== "all" ? eq(organizations.status, params.status as "active") : undefined,
    params.query ? ilike(organizations.name, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const orderBy =
    params.sort === "name_asc"
      ? asc(organizations.name)
      : params.sort === "updated_asc"
        ? asc(organizations.updatedAt)
        : desc(organizations.updatedAt);

  const rows = await database
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const ids = rows.map((row) => row.id);
  const [websiteCounts, memberCounts, lastActivity] =
    ids.length > 0
      ? await Promise.all([
          database
            .select({ organizationId: websites.organizationId, value: count() })
            .from(websites)
            .where(and(inArray(websites.organizationId, ids), isNull(websites.deletedAt)))
            .groupBy(websites.organizationId),
          database
            .select({ organizationId: memberships.organizationId, value: count() })
            .from(memberships)
            .where(and(inArray(memberships.organizationId, ids), isNull(memberships.deletedAt)))
            .groupBy(memberships.organizationId),
          database
            .select({
              organizationId: auditLogs.organizationId,
              value: sql<Date>`max(${auditLogs.createdAt})`,
            })
            .from(auditLogs)
            .where(inArray(auditLogs.organizationId, ids))
            .groupBy(auditLogs.organizationId),
        ])
      : [[], [], []];

  const websiteCountMap = new Map(websiteCounts.map((row) => [row.organizationId, row.value]));
  const memberCountMap = new Map(memberCounts.map((row) => [row.organizationId, row.value]));
  const activityMap = new Map(lastActivity.map((row) => [row.organizationId, row.value]));

  return {
    items: rows.map((row) => ({
      ...row,
      lastActivityAt: activityMap.get(row.id) ?? null,
      memberCount: memberCountMap.get(row.id) ?? 0,
      websiteCount: websiteCountMap.get(row.id) ?? 0,
    })),
    page: params.page,
  };
}

export async function getClientWorkspaceOverview({
  database,
  organizationId,
  request,
}: {
  database: Database;
  organizationId: string;
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "organization:read", organizationId);

  const [organization] = await database
    .select()
    .from(organizations)
    .where(and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)))
    .limit(1);

  if (!organization) {
    return null;
  }

  const clientRequest: DashboardRequest = {
    ...request,
    access: { ...request.access, activeOrganizationId: organizationId, workspaceMode: "client" },
  };

  const [websiteList, content, members, pendingInvitations, recentActivity, attention] =
    await Promise.all([
      getWebsites({
        database,
        params: { organizationId, page: 1, query: "", sort: "updated_desc", status: "all" },
        request: clientRequest,
      }),
      getContentOperations({
        database,
        params: { organizationId, page: 1, query: "", sort: "updated_desc", status: "all" },
        request: clientRequest,
      }),
      database.query.memberships.findMany({
        where: and(eq(memberships.organizationId, organizationId), isNull(memberships.deletedAt)),
        with: { user: true },
        orderBy: (table, { asc: sortAsc }) => [sortAsc(table.createdAt)],
        limit: 8,
      }),
      database.query.invitations.findMany({
        where: and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.status, "pending"),
          isNull(invitations.deletedAt),
        ),
        orderBy: (table, { asc: sortAsc }) => [sortAsc(table.expiresAt)],
        limit: 8,
      }),
      getRecentActivity({ database, organizationId, request: clientRequest, limit: 8 }),
      getAttentionItems({ database, organizationId, request: clientRequest }),
    ]);

  return {
    attention,
    content: content.items.slice(0, 6),
    members,
    organization,
    pendingInvitations,
    recentActivity,
    websites: websiteList.items.slice(0, 6),
  };
}

export async function getWebsites({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams;
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "websites:read", params.organizationId);
  const { limit, offset } = getPagination(params);
  const scopedOrgCondition = activeOrganizationCondition(request, params.organizationId);
  const conditions = [
    isNull(websites.deletedAt),
    scopedOrgCondition,
    params.status !== "all" ? eq(websites.status, params.status as "active") : undefined,
    params.query ? ilike(websites.name, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const orderBy =
    params.sort === "name_asc"
      ? asc(websites.name)
      : params.sort === "updated_asc"
        ? asc(websites.updatedAt)
        : desc(websites.updatedAt);

  const rows = await database
    .select({
      deploymentStatus: websites.deploymentStatus,
      id: websites.id,
      name: websites.name,
      organizationId: websites.organizationId,
      organizationName: organizations.name,
      primaryDomain: websites.primaryDomain,
      projectId: projects.id,
      projectName: projects.name,
      productionUrl: websites.productionUrl,
      status: websites.status,
      updatedAt: websites.updatedAt,
    })
    .from(websites)
    .innerJoin(organizations, eq(websites.organizationId, organizations.id))
    .leftJoin(projects, eq(projects.websiteId, websites.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return { items: rows, page: params.page };
}

export async function getContentOperations({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams;
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "cms:read", params.organizationId);
  const scopedOrgIds = getScopedOrganizationIds(request);
  const requestedOrganizationId = params.organizationId ?? request.access.activeOrganizationId;
  if (requestedOrganizationId && scopedOrgIds !== null && !scopedOrgIds.includes(requestedOrganizationId)) {
    return { draftCount: 0, items: [], page: params.page, publishedCount: 0, scheduledCount: 0 };
  }

  const organizationIds =
    requestedOrganizationId && (scopedOrgIds === null || scopedOrgIds.includes(requestedOrganizationId))
      ? [requestedOrganizationId]
      : scopedOrgIds;

  if (organizationIds?.length === 0) {
    return { draftCount: 0, items: [], page: params.page, publishedCount: 0, scheduledCount: 0 };
  }

  const pageConditions = [
    isNull(pages.deletedAt),
    organizationIds ? inArray(pages.organizationId, organizationIds) : undefined,
    params.status !== "all" ? eq(pages.status, params.status as "draft") : undefined,
    params.query ? ilike(pages.title, `%${params.query}%`) : undefined,
  ].filter(Boolean);
  const postConditions = [
    isNull(posts.deletedAt),
    organizationIds ? inArray(posts.organizationId, organizationIds) : undefined,
    params.status !== "all" ? eq(posts.status, params.status as "draft") : undefined,
    params.query ? ilike(posts.title, `%${params.query}%`) : undefined,
  ].filter(Boolean);

  const [pageRows, postRows] = await Promise.all([
    database
      .select({
        id: pages.id,
        organizationId: pages.organizationId,
        slug: pages.slug,
        status: pages.status,
        title: pages.title,
        type: sql<"page">`'page'`,
        updatedAt: pages.updatedAt,
        websiteId: pages.websiteId,
      })
      .from(pages)
      .where(and(...pageConditions))
      .orderBy(desc(pages.updatedAt))
      .limit(20),
    database
      .select({
        id: posts.id,
        organizationId: posts.organizationId,
        slug: posts.slug,
        status: posts.status,
        title: posts.title,
        type: sql<"post">`'post'`,
        updatedAt: posts.updatedAt,
        websiteId: posts.websiteId,
      })
      .from(posts)
      .where(and(...postConditions))
      .orderBy(desc(posts.updatedAt))
      .limit(20),
  ]);

  const items = [...pageRows, ...postRows]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 20);

  return {
    draftCount: items.filter((item) => item.status === "draft").length,
    items,
    page: params.page,
    publishedCount: items.filter((item) => item.status === "published").length,
    scheduledCount: 0,
  };
}

export async function getTeamOperations({
  database,
  organizationId,
  request,
}: {
  database: Database;
  organizationId?: string;
  request: DashboardRequest;
}) {
  const activeOrganizationId = organizationId ?? request.access.activeOrganizationId;
  if (!activeOrganizationId) {
    return null;
  }

  assertDashboardPermission(request, "organization:read", activeOrganizationId);

  const [members, pendingInvitations] = await Promise.all([
    database.query.memberships.findMany({
      where: and(eq(memberships.organizationId, activeOrganizationId), isNull(memberships.deletedAt)),
      with: { user: true },
      orderBy: (table, { asc: sortAsc }) => [sortAsc(table.createdAt)],
    }),
    database.query.invitations.findMany({
      where: and(
        eq(invitations.organizationId, activeOrganizationId),
        eq(invitations.status, "pending"),
        isNull(invitations.deletedAt),
      ),
      orderBy: (table, { asc: sortAsc }) => [sortAsc(table.expiresAt)],
    }),
  ]);

  return {
    canManage: request.access.canManageMembers,
    members,
    organizationId: activeOrganizationId,
    pendingInvitations,
  };
}

export async function getRecentActivity({
  database,
  limit = 10,
  organizationId,
  request,
}: {
  database: Database;
  limit?: number;
  organizationId?: string;
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "audit:read", organizationId);
  const scopedOrgIds = getScopedOrganizationIds(request);
  const targetOrganizationId = organizationId ?? request.access.activeOrganizationId;
  const orgCondition = targetOrganizationId
    ? eq(auditLogs.organizationId, targetOrganizationId)
    : scopedOrgIds
      ? inArray(auditLogs.organizationId, scopedOrgIds)
      : undefined;

  const rows = await database.query.auditLogs.findMany({
    where: orgCondition,
    with: { actor: true },
    orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
    limit,
  });

  return rows.map(presentAuditLog);
}

export async function getAttentionItems({
  database,
  organizationId,
  request,
}: {
  database: Database;
  organizationId?: string;
  request: DashboardRequest;
}) {
  const scopedOrgIds = getScopedOrganizationIds(request);
  const targetOrganizationId = organizationId ?? request.access.activeOrganizationId;
  const organizationIds =
    targetOrganizationId && (scopedOrgIds === null || scopedOrgIds.includes(targetOrganizationId))
      ? [targetOrganizationId]
      : scopedOrgIds;

  if (organizationIds?.length === 0) {
    return [];
  }

  const orgCondition = organizationIds ? inArray(organizations.id, organizationIds) : undefined;
  const websiteCondition = organizationIds ? inArray(websites.organizationId, organizationIds) : undefined;
  const invitationCondition = organizationIds
    ? inArray(invitations.organizationId, organizationIds)
    : undefined;
  const pageCondition = organizationIds ? inArray(pages.organizationId, organizationIds) : undefined;
  const postCondition = organizationIds ? inArray(posts.organizationId, organizationIds) : undefined;

  const [orgRows, websiteRows, invitationRows, pageRows, postRows, projectRows, mediaRows] = await Promise.all([
    database
      .select({
        id: organizations.id,
        name: organizations.name,
        status: organizations.status,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .where(and(isNull(organizations.deletedAt), orgCondition)),
    database
      .select({
        deploymentStatus: websites.deploymentStatus,
        id: websites.id,
        name: websites.name,
        organizationId: websites.organizationId,
        primaryDomain: websites.primaryDomain,
        projectId: projects.id,
        status: websites.status,
        updatedAt: websites.updatedAt,
      })
      .from(websites)
      .leftJoin(projects, eq(projects.websiteId, websites.id))
      .where(and(isNull(websites.deletedAt), websiteCondition)),
    database
      .select({
        email: invitations.email,
        expiresAt: invitations.expiresAt,
        id: invitations.id,
        organizationId: invitations.organizationId,
        status: invitations.status,
      })
      .from(invitations)
      .where(and(isNull(invitations.deletedAt), invitationCondition)),
    database
      .select({
        id: pages.id,
        organizationId: pages.organizationId,
        status: pages.status,
        title: pages.title,
        type: sql<"page">`'page'`,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(and(isNull(pages.deletedAt), pageCondition, eq(pages.status, "draft"))),
    database
      .select({
        id: posts.id,
        organizationId: posts.organizationId,
        status: posts.status,
        title: posts.title,
        type: sql<"post">`'post'`,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(and(isNull(posts.deletedAt), postCondition, eq(posts.status, "draft"))),
    database
      .select({
        figmaUrl: projects.figmaUrl,
        id: projects.id,
        launchTargetAt: projects.launchTargetAt,
        metadata: projects.metadata,
        name: projects.name,
        organizationId: projects.organizationId,
        status: projects.status,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(
        and(
          isNull(projects.deletedAt),
          organizationIds ? inArray(projects.organizationId, organizationIds) : undefined,
        ),
      ),
    database
      .select({
        altText: mediaAssets.altText,
        filename: mediaAssets.filename,
        id: mediaAssets.id,
        metadata: mediaAssets.metadata,
        mimeType: mediaAssets.mimeType,
        organizationId: mediaAssets.organizationId,
        websiteId: mediaAssets.websiteId,
      })
      .from(mediaAssets)
      .where(
        and(
          isNull(mediaAssets.deletedAt),
          organizationIds ? inArray(mediaAssets.organizationId, organizationIds) : undefined,
        ),
      ),
  ]);

  return [
    ...getOrganizationAttentionItems(orgRows),
    ...getWebsiteAttentionItems(websiteRows),
    ...getProjectAttentionItems(projectRows),
    ...getInvitationAttentionItems(invitationRows),
    ...getMediaAttentionItems(mediaRows),
    ...getContentAttentionItems([...pageRows, ...postRows]),
  ].sort((a, b) => {
    const severity = { critical: 0, warning: 1, info: 2 };
    return severity[a.severity] - severity[b.severity];
  });
}
