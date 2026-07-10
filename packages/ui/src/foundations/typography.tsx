import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@agency/lib/utils";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingSize = "sm" | "md" | "lg" | "xl";
type TextTone = "default" | "muted" | "subtle" | "inverse";
type TextSize = "xs" | "sm" | "md" | "lg";

const headingSizes: Record<HeadingSize, string> = {
  sm: "text-xl leading-tight",
  md: "text-2xl leading-tight md:text-3xl",
  lg: "text-3xl leading-tight md:text-4xl",
  xl: "text-4xl leading-tight md:text-5xl",
};

const textSizes: Record<TextSize, string> = {
  xs: "text-xs leading-normal",
  sm: "text-sm leading-normal",
  md: "text-base leading-normal",
  lg: "text-lg leading-relaxed",
};

const tones: Record<TextTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  subtle: "text-subtle-foreground",
  inverse: "text-inverse-foreground",
};

interface HeadingProps extends ComponentPropsWithoutRef<"h2"> {
  as?: HeadingLevel;
  size?: HeadingSize;
}

interface TextProps extends ComponentPropsWithoutRef<"p"> {
  as?: ElementType;
  size?: TextSize;
  tone?: TextTone;
}

export function Heading({ as: Component = "h2", className, size = "md", ...props }: HeadingProps) {
  return (
    <Component
      className={cn("font-display font-semibold tracking-normal", headingSizes[size], className)}
      {...props}
    />
  );
}

export function Text({
  as: Component = "p",
  className,
  size = "md",
  tone = "default",
  ...props
}: TextProps) {
  return <Component className={cn(textSizes[size], tones[tone], className)} {...props} />;
}
