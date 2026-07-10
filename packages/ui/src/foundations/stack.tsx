import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

type StackGap = "none" | "xs" | "sm" | "md" | "lg" | "xl";

const stackGaps: Record<StackGap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

interface StackProps extends ComponentPropsWithoutRef<"div"> {
  as?: ElementType;
  gap?: StackGap;
}

export function Stack({ as: Component = "div", className, gap = "md", ...props }: StackProps) {
  return <Component className={cn("flex flex-col", stackGaps[gap], className)} {...props} />;
}
