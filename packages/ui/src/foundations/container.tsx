import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

type ContainerSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

const containerSizes: Record<ContainerSize, string> = {
  sm: "max-w-container-sm",
  md: "max-w-container-md",
  lg: "max-w-container-lg",
  xl: "max-w-container-xl",
  "2xl": "max-w-container-2xl",
  full: "max-w-full",
};

interface ContainerProps extends ComponentPropsWithoutRef<"div"> {
  as?: ElementType;
  size?: ContainerSize;
}

export function Container({
  as: Component = "div",
  className,
  size = "xl",
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", containerSizes[size], className)}
      {...props}
    />
  );
}
