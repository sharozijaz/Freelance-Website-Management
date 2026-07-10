import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

type SectionSpacing = "none" | "sm" | "md" | "lg" | "xl";

const sectionSpacing: Record<SectionSpacing, string> = {
  none: "py-0",
  sm: "py-8",
  md: "py-12",
  lg: "py-16",
  xl: "py-24",
};

interface SectionProps extends ComponentPropsWithoutRef<"section"> {
  as?: ElementType;
  spacing?: SectionSpacing;
}

export function Section({
  as: Component = "section",
  className,
  spacing = "lg",
  ...props
}: SectionProps) {
  return <Component className={cn(sectionSpacing[spacing], className)} {...props} />;
}
