import { and, asc, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import {
  auditLogs,
  memberships,
  organizations,
  pages,
  posts,
  projectAssignments,
  projects,
  users,
  websiteEnvironments,
  websites,
} from "@agency/database/schema";
import { normalizeOrganizationSlug } from "@agency/auth/organizations";
import { isWebsiteType } from "@agency/lib/modules";
import { assertDashboardPermission, getScopedOrganizationIds } from "./access";
import { compareDashboardDatesDesc } from "./dates";
import { getPagination } from "./filters";
import type { DashboardRequest, DashboardSearchParams } from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

const defaultWebsiteEnvironmentTypes = ["staging", "production"] as const;

function defaultEnvironmentName(type: (typeof defaultWebsiteEnvironmentTypes)[number]) {
  return type === "staging" ? "Staging" : "Production";
}

async function ensureDefaultWebsiteEnvironments({
  database,
  website,
}: {
  database: Pick<Database, "insert" | "query">;
  website: Pick<
    typeof websites.$inferSelect,
    "id" | "organizationId" | "previewUrl" | "productionUrl" | "websiteType"
  >;
}) {
  if (website.websiteType !== "sharoz_connected") {
    return;
  }

  for (const type of defaultWebsiteEnvironmentTypes) {
    const existing = await database.query.websiteEnvironments.findFirst({
      where: and(eq(websiteEnvironments.websiteId, website.id), eq(websiteEnvironments.type, type)),
      columns: { id: true },
    });

    if (existing) {
      continue;
    }

    await database.insert(websiteEnvironments).values({
      baseUrl: type === "staging" ? website.previewUrl : website.productionUrl,
      name: defaultEnvironmentName(type),
      organizationId: website.organizationId,
      status: "active",
      type,
      websiteId: website.id,
    });
  }
}

export const projectStatuses = [
  "planning",
  "design",
  "development",
  "internal_review",
  "client_review",
  "ready_to_launch",
  "live",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const projectStatusLabels: Record<ProjectStatus, string> = {
  cancelled: "Cancelled",
  client_review: "Client Review",
  completed: "Completed",
  design: "Design",
  development: "Development",
  internal_review: "Internal Review",
  live: "Live",
  on_hold: "On Hold",
  planning: "Planning",
  ready_to_launch: "Ready to Launch",
};

export const projectTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  planning: ["design", "on_hold", "cancelled"],
  design: ["planning", "development", "on_hold", "cancelled"],
  development: ["design", "internal_review", "on_hold", "cancelled"],
  internal_review: ["development", "client_review", "on_hold", "cancelled"],
  client_review: ["internal_review", "ready_to_launch", "on_hold", "cancelled"],
  ready_to_launch: ["client_review", "live", "on_hold", "cancelled"],
  live: ["ready_to_launch", "completed", "on_hold"],
  on_hold: ["planning", "design", "development", "internal_review", "client_review", "cancelled"],
  completed: [],
  cancelled: [],
};

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus);
}

export function getValidProjectTransitions(status: ProjectStatus): ProjectStatus[] {
  return projectTransitions[status];
}

export function assertValidProjectTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (!projectTransitions[from].includes(to)) {
    throw new ProjectValidationError(
      `Project cannot move from ${projectStatusLabels[from]} to ${projectStatusLabels[to]}.`,
    );
  }
}

export function validateFigmaUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ProjectValidationError("Figma URL must be a valid URL.");
  }

  const host = url.hostname.toLowerCase();
  if (!host.endsWith("figma.com") && !host.endsWith("figjam.com")) {
    throw new ProjectValidationError("Figma URL must be a figma.com or figjam.com URL.");
  }

  return url.toString();
}

function scopedOrganizationCondition(request: DashboardRequest, column = projects.organizationId) {
  const ids = getScopedOrganizationIds(request);

  if (ids === null) {
    return undefined;
  }

  if (ids.length === 0) {
    return sql`false`;
  }

  return inArray(column, ids);
}

function activeProjectOrganizationCondition(
  request: DashboardRequest,
  organizationId?: string,
) {
  const requestedOrganizationId =
    organizationId ?? request.access.activeOrganizationId ?? undefined;
  const ids = getScopedOrganizationIds(request);

  if (requestedOrganizationId) {
    if (ids !== null && !ids.includes(requestedOrganizationId)) {
      return sql`false`;
    }

    return eq(projects.organizationId, requestedOrganizationId);
  }

  return scopedOrganizationCondition(request);
}

async function writeAudit({
  action,
  database,
  metadata = {},
  organizationId,
  request,
  resourceId,
  resourceType,
}: {
  action: string;
  database: Database;
  metadata?: Record<string, unknown>;
  organizationId: string;
  request: DashboardRequest;
  resourceId?: string | null;
  resourceType: string;
}) {
  await database.insert(auditLogs).values({
    action,
    actorUserId: request.context.user.id,
    metadata,
    organizationId,
    resourceId,
    resourceType,
  });
}

function normalizeSlug(value: string) {
  const slug = normalizeOrganizationSlug(value);
  if (!slug) {
    throw new ProjectValidationError("Slug is required.");
  }

  return slug;
}

export async function createProject({
  database,
  input,
  request,
}: {
  database: Database;
  input: {
    assignedUserIds?: string[];
    figmaUrl?: string | null;
    internalNotes?: string | null;
    launchTargetAt?: Date | null;
    name: string;
    organizationId: string;
    slug?: string | null;
    websiteId?: string | null;
  };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "projects:manage", input.organizationId);

  const name = input.name.trim();
  if (name.length < 2) {
    throw new ProjectValidationError("Project name must be at least 2 characters.");
  }

  const slug = normalizeSlug(input.slug ?? name);
  const figmaUrl = validateFigmaUrl(input.figmaUrl);

  if (input.websiteId) {
    await requireWebsiteAccess({ database, request, websiteId: input.websiteId });
  }

  const existing = await database.query.projects.findFirst({
    where: and(
      eq(projects.organizationId, input.organizationId),
      eq(projects.slug, slug),
      isNull(projects.deletedAt),
    ),
    columns: { id: true },
  });

  if (existing) {
    throw new ProjectValidationError("A project with that slug already exists for this client.");
  }

  const internalNotes = input.internalNotes?.trim() ?? undefined;

  const [project] = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(projects)
      .values({
        figmaUrl,
        launchTargetAt: input.launchTargetAt ?? null,
        metadata: {
          internalNotes,
          statusChangedAt: new Date().toISOString(),
        },
        name,
        organizationId: input.organizationId,
        slug,
        status: "planning",
        websiteId: input.websiteId ?? null,
      })
      .returning();

    if (!created) {
      throw new ProjectValidationError("Project could not be created.");
    }

    if (input.assignedUserIds?.length) {
      await tx.insert(projectAssignments).values(
        input.assignedUserIds.map((userId) => ({
          assignedByUserId: request.context.user.id,
          organizationId: input.organizationId,
          projectId: created.id,
          userId,
        })),
      );
    }

    await tx.insert(auditLogs).values({
      action: "project.created",
      actorUserId: request.context.user.id,
      metadata: { figmaUrl: Boolean(figmaUrl), websiteId: input.websiteId ?? null },
      organizationId: input.organizationId,
      resourceId: created.id,
      resourceType: "project",
    });

    return [created];
  });

  return project;
}

export async function updateProject({
  database,
  input,
  projectId,
  request,
}: {
  database: Database;
  input: {
    figmaUrl?: string | null;
    internalNotes?: string | null;
    launchTargetAt?: Date | null;
    name?: string | null;
    websiteId?: string | null;
  };
  projectId: string;
  request: DashboardRequest;
}) {
  const project = await requireProjectAccess({
    database,
    projectId,
    request,
    permission: "projects:manage",
  });
  const figmaUrl =
    input.figmaUrl === undefined ? project.figmaUrl : validateFigmaUrl(input.figmaUrl);

  if (input.websiteId) {
    const website = await requireWebsiteAccess({ database, request, websiteId: input.websiteId });
    if (website.organizationId !== project.organizationId) {
      throw new ProjectValidationError("Website must belong to the same client organization.");
    }
  }

  const nextMetadata = {
    ...project.metadata,
    ...(input.internalNotes !== undefined
      ? { internalNotes: input.internalNotes?.trim() ?? undefined }
      : {}),
  };

  const [updated] = await database
    .update(projects)
    .set({
      figmaUrl,
      launchTargetAt:
        input.launchTargetAt === undefined ? project.launchTargetAt : input.launchTargetAt,
      metadata: nextMetadata,
      name: input.name?.trim() ?? project.name,
      updatedAt: new Date(),
      websiteId: input.websiteId === undefined ? project.websiteId : input.websiteId,
    })
    .where(eq(projects.id, project.id))
    .returning();

  await writeAudit({
    action: "project.updated",
    database,
    metadata: {
      figmaUrlUpdated: input.figmaUrl !== undefined,
      launchTargetUpdated: input.launchTargetAt !== undefined,
      websiteId: input.websiteId ?? project.websiteId,
    },
    organizationId: project.organizationId,
    request,
    resourceId: project.id,
    resourceType: "project",
  });

  if (input.websiteId !== undefined && input.websiteId !== project.websiteId) {
    await writeAudit({
      action: "website.connected_to_project",
      database,
      metadata: { projectId: project.id, websiteId: input.websiteId },
      organizationId: project.organizationId,
      request,
      resourceId: input.websiteId,
      resourceType: "website",
    });
  }

  return updated;
}

export async function transitionProject({
  database,
  projectId,
  request,
  status,
}: {
  database: Database;
  projectId: string;
  request: DashboardRequest;
  status: ProjectStatus;
}) {
  const project = await requireProjectAccess({
    database,
    projectId,
    request,
    permission: "projects:manage",
  });
  if (!isProjectStatus(project.status)) {
    throw new ProjectValidationError("Project uses an unsupported lifecycle status.");
  }

  const currentStatus = project.status;
  assertValidProjectTransition(currentStatus, status);

  const [updated] = await database
    .update(projects)
    .set({
      metadata: {
        ...project.metadata,
        previousStatus: currentStatus,
        statusChangedAt: new Date().toISOString(),
      },
      status,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, project.id))
    .returning();

  await writeAudit({
    action: "project.status_changed",
    database,
    metadata: { from: currentStatus, to: status },
    organizationId: project.organizationId,
    request,
    resourceId: project.id,
    resourceType: "project",
  });

  return updated;
}

export async function archiveProject({
  database,
  projectId,
  request,
}: {
  database: Database;
  projectId: string;
  request: DashboardRequest;
}) {
  const project = await requireProjectAccess({
    database,
    projectId,
    request,
    permission: "projects:manage",
  });
  const [updated] = await database
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, project.id))
    .returning();

  await writeAudit({
    action: "project.archived",
    database,
    organizationId: project.organizationId,
    request,
    resourceId: project.id,
    resourceType: "project",
  });

  return updated;
}

export async function createWebsite({
  database,
  input,
  request,
}: {
  database: Database;
  input: {
    name: string;
    organizationId: string;
    primaryDomain?: string | null;
    projectId?: string | null;
    slug?: string | null;
    status?: "draft" | "active" | "paused" | "archived";
    theme?: Record<string, unknown>;
    websiteType?: string | null;
  };
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "websites:manage", input.organizationId);

  const name = input.name.trim();
  if (name.length < 2) {
    throw new ProjectValidationError("Website name must be at least 2 characters.");
  }

  const slug = normalizeSlug(input.slug ?? name);
  const websiteType = input.websiteType ?? "external_legacy";

  if (!isWebsiteType(websiteType)) {
    throw new ProjectValidationError("Website type is not supported.");
  }

  if (input.projectId) {
    const project = await requireProjectAccess({
      database,
      projectId: input.projectId,
      request,
      permission: "projects:manage",
    });
    if (project.organizationId !== input.organizationId) {
      throw new ProjectValidationError("Project must belong to the selected client organization.");
    }
  }

  const existing = await database.query.websites.findFirst({
    where: and(
      eq(websites.organizationId, input.organizationId),
      eq(websites.slug, slug),
      isNull(websites.deletedAt),
    ),
    columns: { id: true },
  });

  if (existing) {
    throw new ProjectValidationError("A website with that slug already exists for this client.");
  }

  const [website] = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(websites)
      .values({
        name,
        organizationId: input.organizationId,
        primaryDomain: input.primaryDomain?.trim() ?? null,
        slug,
        status: input.status ?? "draft",
        theme: input.theme ?? {},
        websiteType,
      })
      .returning();

    if (!created) {
      throw new ProjectValidationError("Website could not be created.");
    }

    if (input.projectId) {
      await tx
        .update(projects)
        .set({ updatedAt: new Date(), websiteId: created.id })
        .where(eq(projects.id, input.projectId));
    }

    await tx.insert(auditLogs).values({
      action: "website.created",
      actorUserId: request.context.user.id,
      metadata: { projectId: input.projectId ?? null, websiteType },
      organizationId: input.organizationId,
      resourceId: created.id,
      resourceType: "website",
    });

    await ensureDefaultWebsiteEnvironments({ database: tx, website: created });

    return [created];
  });

  return website;
}

export async function updateWebsiteType({
  database,
  request,
  websiteId,
  websiteType,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
  websiteType: string;
}) {
  if (!isWebsiteType(websiteType)) {
    throw new ProjectValidationError("Website type is not supported.");
  }

  const website = await requireWebsiteAccess({
    database,
    permission: "websites:manage",
    request,
    websiteId,
  });

  if (website.websiteType === websiteType) {
    return website;
  }

  const [updated] = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(websites)
      .set({ updatedAt: new Date(), websiteType })
      .where(eq(websites.id, website.id))
      .returning();

    if (!row) {
      throw new ProjectValidationError("Website type could not be updated.");
    }

    await ensureDefaultWebsiteEnvironments({ database: tx, website: row });

    return [row];
  });

  await writeAudit({
    action: "website.type_changed",
    database,
    metadata: { from: website.websiteType, to: websiteType },
    organizationId: website.organizationId,
    request,
    resourceId: website.id,
    resourceType: "website",
  });

  return updated;
}

export async function requireProjectAccess({
  database,
  permission = "projects:read",
  projectId,
  request,
}: {
  database: Database;
  permission?: "projects:read" | "projects:manage";
  projectId: string;
  request: DashboardRequest;
}) {
  const project = await database.query.projects.findFirst({
    where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
    with: { organization: true, website: true },
  });

  if (!project) {
    throw new ProjectValidationError("Project was not found.");
  }

  if (project.organization.deletedAt) {
    throw new ProjectValidationError("Project was not found.");
  }

  assertDashboardPermission(request, permission, project.organizationId);
  return project;
}

export async function requireWebsiteAccess({
  database,
  permission = "websites:read",
  request,
  websiteId,
}: {
  database: Database;
  permission?:
    | "websites:read"
    | "websites:manage"
    | "modules:read"
    | "modules:manage"
    | "developer:credentials"
    | "blog:read"
    | "blog:create"
    | "blog:update"
    | "blog:publish"
    | "blog:delete";
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await database.query.websites.findFirst({
    where: and(eq(websites.id, websiteId), isNull(websites.deletedAt)),
    with: { organization: true, projects: true },
  });

  if (!website) {
    throw new ProjectValidationError("Website was not found.");
  }

  assertDashboardPermission(request, permission, website.organizationId);
  return website;
}

export async function getActiveWebsite({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId?: string | null;
}) {
  if (!websiteId) {
    return null;
  }

  return requireWebsiteAccess({ database, request, websiteId });
}

export async function withWebsiteScope<T>({
  callback,
  database,
  request,
  websiteId,
}: {
  callback: (scope: { organizationId: string; websiteId: string }) => Promise<T>;
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, request, websiteId });
  return callback({ organizationId: website.organizationId, websiteId: website.id });
}

export async function getProjects({
  database,
  params,
  request,
}: {
  database: Database;
  params: DashboardSearchParams;
  request: DashboardRequest;
}) {
  assertDashboardPermission(request, "projects:read", params.organizationId);
  const { limit, offset } = getPagination(params);
  const orgCondition = activeProjectOrganizationCondition(request, params.organizationId);
  const orderBy =
    params.sort === "launch_asc"
      ? asc(projects.launchTargetAt)
      : params.sort === "launch_desc"
        ? desc(projects.launchTargetAt)
        : desc(projects.updatedAt);

  const rows = await database
    .select({
      figmaUrl: projects.figmaUrl,
      id: projects.id,
      launchTargetAt: projects.launchTargetAt,
      name: projects.name,
      organizationId: projects.organizationId,
      organizationName: organizations.name,
      status: projects.status,
      updatedAt: projects.updatedAt,
      websiteId: projects.websiteId,
      websiteName: websites.name,
    })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .leftJoin(websites, eq(projects.websiteId, websites.id))
    .where(
      and(
        isNull(projects.deletedAt),
        isNull(organizations.deletedAt),
        orgCondition,
        params.status !== "all" ? eq(projects.status, params.status as ProjectStatus) : undefined,
        params.query ? ilike(projects.name, `%${params.query}%`) : undefined,
      ),
    )
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return { items: rows, page: params.page };
}

export async function getProjectDetail({
  database,
  projectId,
  request,
}: {
  database: Database;
  projectId: string;
  request: DashboardRequest;
}) {
  const project = await requireProjectAccess({ database, projectId, request });
  const [members, activity] = await Promise.all([
    database
      .select({
        email: users.email,
        name: users.name,
        role: memberships.role,
        userId: users.id,
      })
      .from(projectAssignments)
      .innerJoin(memberships, eq(projectAssignments.userId, memberships.userId))
      .innerJoin(users, eq(projectAssignments.userId, users.id))
      .where(
        and(
          eq(projectAssignments.organizationId, project.organizationId),
          eq(projectAssignments.projectId, project.id),
          eq(memberships.organizationId, project.organizationId),
          eq(memberships.status, "active"),
          isNull(memberships.deletedAt),
          isNull(users.deletedAt),
        ),
      )
      .limit(10),
    database.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.organizationId, project.organizationId),
        eq(auditLogs.resourceId, project.id),
      ),
      with: { actor: true },
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
      limit: 8,
    }),
  ]);

  return {
    activity,
    members,
    project,
    transitions: getValidProjectTransitions(project.status as ProjectStatus),
  };
}

export async function getWebsiteDetail({
  database,
  request,
  websiteId,
}: {
  database: Database;
  request: DashboardRequest;
  websiteId: string;
}) {
  const website = await requireWebsiteAccess({ database, request, websiteId });
  const [project, pageRows, postRows, activity] = await Promise.all([
    database.query.projects.findFirst({
      where: and(eq(projects.websiteId, website.id), isNull(projects.deletedAt)),
      with: { organization: true },
    }),
    database.query.pages.findMany({
      where: and(
        eq(pages.organizationId, website.organizationId),
        eq(pages.websiteId, website.id),
        isNull(pages.deletedAt),
      ),
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.updatedAt)],
      limit: 5,
    }),
    database.query.posts.findMany({
      where: and(
        eq(posts.organizationId, website.organizationId),
        eq(posts.websiteId, website.id),
        isNull(posts.deletedAt),
      ),
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.updatedAt)],
      limit: 5,
    }),
    database.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.organizationId, website.organizationId),
        eq(auditLogs.resourceId, website.id),
      ),
      with: { actor: true },
      orderBy: (table, { desc: sortDesc }) => [sortDesc(table.createdAt)],
      limit: 8,
    }),
  ]);

  return {
    activity,
    content: [
      ...pageRows.map((item) => ({ ...item, type: "page" as const })),
      ...postRows.map((item) => ({ ...item, type: "post" as const })),
    ].sort((a, b) => compareDashboardDatesDesc(a.updatedAt, b.updatedAt)),
    project,
    website,
  };
}

export async function getProjectCreationOptions({
  database,
  request,
}: {
  database: Database;
  request: DashboardRequest;
}) {
  const orgIds = getScopedOrganizationIds(request);
  const organizationCondition = orgIds ? inArray(organizations.id, orgIds) : undefined;
  const [organizationRows, websiteRows] = await Promise.all([
    database.query.organizations.findMany({
      where: and(isNull(organizations.deletedAt), organizationCondition),
      orderBy: (table, { asc: sortAsc }) => [sortAsc(table.name)],
    }),
    database.query.websites.findMany({
      where: and(
        isNull(websites.deletedAt),
        orgIds ? inArray(websites.organizationId, orgIds) : undefined,
      ),
      orderBy: (table, { asc: sortAsc }) => [sortAsc(table.name)],
    }),
  ]);

  const projectRows = await database.query.projects.findMany({
    where: and(
      isNull(projects.deletedAt),
      orgIds ? inArray(projects.organizationId, orgIds) : undefined,
    ),
    orderBy: (table, { asc: sortAsc }) => [sortAsc(table.name)],
  });

  return { organizations: organizationRows, projects: projectRows, websites: websiteRows };
}
