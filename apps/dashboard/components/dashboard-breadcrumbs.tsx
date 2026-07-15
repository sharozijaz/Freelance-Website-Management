import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@agency/lib/utils";

export interface DashboardBreadcrumb {
  href?: string;
  label: string;
}

export function DashboardBreadcrumbs({
  items,
  className,
}: {
  className?: string;
  items: DashboardBreadcrumb[];
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li className="flex items-center gap-1" key={`${item.label}-${String(index)}`}>
              {index > 0 ? <ChevronRight aria-hidden className="size-3.5" /> : null}
              {item.href && !isCurrent ? (
                <Link className="hover:text-foreground" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} className="text-foreground">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
