import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

interface GridProps extends ComponentPropsWithoutRef<"div"> {
  as?: ElementType;
  columns?: "1" | "2" | "3" | "4" | "auto";
  gap?: "sm" | "md" | "lg";
}

const columns = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
  "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  auto: "grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]",
} as const;

const gaps = {
  sm: "gap-3",
  md: "gap-6",
  lg: "gap-8",
} as const;

export function Grid({
  as: Component = "div",
  className,
  columns: columnCount = "auto",
  gap = "md",
  ...props
}: GridProps) {
  return (
    <Component className={cn("grid", columns[columnCount], gaps[gap], className)} {...props} />
  );
}
