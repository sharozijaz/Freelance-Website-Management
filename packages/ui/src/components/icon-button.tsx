import { forwardRef } from "react";
import { cn } from "@agency/lib/utils";
import { Button, type ButtonProps } from "./button";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  label: string;
  size?: "sm" | "md" | "lg";
}

const iconButtonSizes = {
  sm: "size-8",
  md: "size-10",
  lg: "size-11",
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, label, size = "md", ...props }, ref) => (
    <Button
      aria-label={label}
      className={cn(iconButtonSizes[size], "px-0", className)}
      ref={ref}
      {...props}
    >
      {children}
    </Button>
  ),
);

IconButton.displayName = "IconButton";
