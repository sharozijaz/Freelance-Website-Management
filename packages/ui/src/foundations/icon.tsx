import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

type IconSize = "sm" | "md" | "lg";

const sizes: Record<IconSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

interface IconFrameProps extends ComponentPropsWithoutRef<"span"> {
  as?: ElementType;
  size?: IconSize;
}

export function IconFrame({
  as: Component = "span",
  className,
  size = "md",
  ...props
}: IconFrameProps) {
  return (
    <Component
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center", sizes[size], className)}
      {...props}
    />
  );
}
