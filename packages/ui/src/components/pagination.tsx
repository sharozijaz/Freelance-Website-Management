import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { forwardRef, type AnchorHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@agency/lib/utils";
import { type ButtonProps } from "./button";

export const Pagination = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <nav
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      ref={ref}
      {...props}
    />
  ),
);

Pagination.displayName = "Pagination";

export const PaginationContent = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul className={cn("flex flex-row items-center gap-1", className)} ref={ref} {...props} />
  ),
);

PaginationContent.displayName = "PaginationContent";

export const PaginationItem = forwardRef<HTMLLIElement, HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li className={cn("", className)} ref={ref} {...props} />,
);

PaginationItem.displayName = "PaginationItem";

export interface PaginationLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  isActive?: boolean;
  size?: ButtonProps["size"];
}

export const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors duration-normal ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-disabled",
      size === "icon" ? "size-10" : "h-10 px-4",
      isActive ? "border border-border bg-surface" : "hover:bg-muted",
      className,
    )}
    {...props}
  />
);

export const PaginationPrevious = ({ className, ...props }: PaginationLinkProps) => (
  <PaginationLink className={cn("gap-1 pl-2.5", className)} size="md" {...props}>
    <ChevronLeft className="size-4" />
    <span>Previous</span>
  </PaginationLink>
);

export const PaginationNext = ({ className, ...props }: PaginationLinkProps) => (
  <PaginationLink className={cn("gap-1 pr-2.5", className)} size="md" {...props}>
    <span>Next</span>
    <ChevronRight className="size-4" />
  </PaginationLink>
);

export const PaginationEllipsis = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span
    aria-hidden
    className={cn("flex size-10 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="size-4" />
    <span className="sr-only">More pages</span>
  </span>
);
