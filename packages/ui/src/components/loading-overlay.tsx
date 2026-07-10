import { type HTMLAttributes } from "react";
import { cn } from "@agency/lib/utils";
import { Spinner } from "./spinner";

export interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function LoadingOverlay({ className, label = "Loading", ...props }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-overlay flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      <Spinner label={label} />
    </div>
  );
}
