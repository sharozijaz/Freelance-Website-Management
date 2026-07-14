import { Button, Input } from "@agency/ui";

export function FilterBar({
  defaultQuery,
  defaultSort = "updated_desc",
  defaultStatus = "all",
  statuses,
}: {
  defaultQuery?: string;
  defaultSort?: string;
  defaultStatus?: string;
  statuses: string[];
}) {
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 md:flex-row"
      method="get"
    >
      <Input
        aria-label="Search"
        className="md:max-w-xs"
        defaultValue={defaultQuery}
        name="q"
        placeholder="Search"
      />
      <select
        aria-label="Filter by status"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        defaultValue={defaultStatus}
        name="status"
      >
        <option value="all">All statuses</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        defaultValue={defaultSort}
        name="sort"
      >
        <option value="updated_desc">Recently updated</option>
        <option value="updated_asc">Oldest updated</option>
        <option value="name_asc">Name A-Z</option>
      </select>
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}
