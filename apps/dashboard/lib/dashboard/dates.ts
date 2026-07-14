export type DashboardDateInput = Date | number | string | null | undefined;

export function toDashboardDate(value: DashboardDateInput) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function formatDashboardDate(value: DashboardDateInput, fallback = "Not set") {
  return toDashboardDate(value)?.toLocaleDateString() ?? fallback;
}

export function formatDashboardDateTime(value: DashboardDateInput, fallback = "Not recorded") {
  return toDashboardDate(value)?.toLocaleString() ?? fallback;
}

export function dashboardDateInputValue(value: DashboardDateInput) {
  return toDashboardDate(value)?.toISOString().slice(0, 10) ?? "";
}

export function compareDashboardDatesDesc(a: DashboardDateInput, b: DashboardDateInput) {
  return (toDashboardDate(b)?.getTime() ?? 0) - (toDashboardDate(a)?.getTime() ?? 0);
}
