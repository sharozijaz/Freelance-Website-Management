import type { DashboardSearchParams } from "./types";

const defaultPageSize = 20;
const maxPageSize = 50;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parseDashboardSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): DashboardSearchParams {
  const pageValue = Number.parseInt(firstParam(searchParams.page), 10);

  const organizationId = firstParam(searchParams.organizationId);

  return {
    ...(organizationId ? { organizationId } : {}),
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
    query: firstParam(searchParams.q).trim(),
    sort: firstParam(searchParams.sort) || "updated_desc",
    status: firstParam(searchParams.status) || "all",
  };
}

export function getPagination(params: DashboardSearchParams, pageSize = defaultPageSize) {
  const limit = Math.min(Math.max(pageSize, 1), maxPageSize);
  return {
    limit,
    offset: (params.page - 1) * limit,
  };
}

export function createSearchHref(
  pathname: string,
  params: DashboardSearchParams,
  overrides: Partial<DashboardSearchParams>,
) {
  const nextParams = new URLSearchParams();
  const merged = { ...params, ...overrides };

  if (merged.query) nextParams.set("q", merged.query);
  if (merged.status && merged.status !== "all") nextParams.set("status", merged.status);
  if (merged.sort && merged.sort !== "updated_desc") nextParams.set("sort", merged.sort);
  if (merged.organizationId) nextParams.set("organizationId", merged.organizationId);
  if (merged.page > 1) nextParams.set("page", String(merged.page));

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
