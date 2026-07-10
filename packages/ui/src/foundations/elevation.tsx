import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

type ElevationLevel = "none" | "xs" | "sm" | "md" | "lg";

const levels: Record<ElevationLevel, string> = {
  none: "shadow-none",
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

interface ElevationProps extends ComponentPropsWithoutRef<"div"> {
  as?: ElementType;
  level?: ElevationLevel;
}

export function Elevation({
  as: Component = "div",
  className,
  level = "sm",
  ...props
}: ElevationProps) {
  return <Component className={cn(levels[level], className)} {...props} />;
}
