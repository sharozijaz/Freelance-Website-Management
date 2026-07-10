import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

type SurfaceTone = "default" | "muted" | "raised" | "inverse";
type SurfaceRadius = "none" | "sm" | "md" | "lg";

const surfaceTones: Record<SurfaceTone, string> = {
  default: "bg-surface text-foreground",
  muted: "bg-muted text-foreground",
  raised: "bg-elevated text-foreground shadow-sm",
  inverse: "bg-inverse text-inverse-foreground",
};

const radii: Record<SurfaceRadius, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
};

interface SurfaceProps extends ComponentPropsWithoutRef<"div"> {
  as?: ElementType;
  radius?: SurfaceRadius;
  tone?: SurfaceTone;
}

export function Surface({
  as: Component = "div",
  className,
  radius = "md",
  tone = "default",
  ...props
}: SurfaceProps) {
  return <Component className={cn(surfaceTones[tone], radii[radius], className)} {...props} />;
}
