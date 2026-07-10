import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

interface FlexProps extends ComponentPropsWithoutRef<"div"> {
  as?: ElementType;
  align?: "start" | "center" | "end" | "stretch";
  gap?: "none" | "sm" | "md" | "lg";
  justify?: "start" | "center" | "between" | "end";
  wrap?: boolean;
}

const alignments = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const gaps = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
} as const;

const justifications = {
  start: "justify-start",
  center: "justify-center",
  between: "justify-between",
  end: "justify-end",
} as const;

export function Flex({
  as: Component = "div",
  align = "start",
  className,
  gap = "md",
  justify = "start",
  wrap = false,
  ...props
}: FlexProps) {
  return (
    <Component
      className={cn(
        "flex",
        alignments[align],
        gaps[gap],
        justifications[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  );
}
