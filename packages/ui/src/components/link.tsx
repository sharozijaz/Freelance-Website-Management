import { forwardRef, type AnchorHTMLAttributes } from "react";
import { cn } from "@agency/lib/utils";

export const Link = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ className, ...props }, ref) => (
    <a
      className={cn(
        "font-medium text-primary underline-offset-4 transition-colors duration-normal ease-standard hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

Link.displayName = "Link";
