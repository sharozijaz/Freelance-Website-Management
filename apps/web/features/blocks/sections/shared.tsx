import Image from "next/image";
import NextLink from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { Button, Container, Section, Stack, Text } from "@agency/ui";
import { getMediaAlt, getMediaUrl, isMedia } from "@/lib/media";
import type { PayloadMedia } from "@/lib/payload/types";
import type { ReactNode } from "react";

export interface SectionCta {
  label?: string;
  url?: string;
}

export interface SectionMedia {
  alt?: string;
  media?: PayloadMedia | string;
  url?: string;
}

export function getText(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

export function SectionHeader({
  eyebrow,
  headline,
  text,
}: {
  eyebrow?: string | undefined;
  headline: string;
  text?: string | undefined;
}) {
  return (
    <Stack className="mx-auto max-w-3xl text-center" gap="sm">
      {eyebrow ? (
        <Text className="font-medium text-primary" size="sm">
          {eyebrow}
        </Text>
      ) : null}
      <h2 className="font-display text-3xl font-semibold tracking-normal md:text-4xl">
        {headline}
      </h2>
      {text ? <Text className="text-muted-foreground">{text}</Text> : null}
    </Stack>
  );
}

export function CtaButton({
  cta,
  variant = "primary",
}: {
  cta?: SectionCta | undefined;
  variant?: "outline" | "primary" | "secondary" | undefined;
}) {
  if (!cta?.label || !cta.url) {
    return null;
  }

  return (
    <Button asChild variant={variant}>
      <NextLink href={cta.url}>
        {cta.label}
        <ArrowRight className="size-4" />
      </NextLink>
    </Button>
  );
}

export function ResponsiveMedia({
  className,
  image,
  priority = false,
}: {
  className?: string | undefined;
  image?: SectionMedia | undefined;
  priority?: boolean | undefined;
}) {
  const mediaUrl = image?.url ?? getMediaUrl(image?.media);

  if (!mediaUrl) {
    return null;
  }

  const media = image?.media;
  const alt = image?.alt ?? getMediaAlt(media);
  const width = isMedia(media) ? (media.width ?? 1400) : 1400;
  const height = isMedia(media) ? (media.height ?? 900) : 900;

  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      priority={priority}
      src={mediaUrl}
      width={width}
    />
  );
}

export function FeatureCheck({ children }: { children: string }) {
  return (
    <li className="flex gap-2 text-sm">
      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

export function Rating({ value = 5 }: { value?: number | undefined }) {
  const safeValue = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <div aria-label={`${safeValue.toString()} out of 5 stars`} className="flex gap-1">
      {Array.from({ length: safeValue }).map((_, index) => (
        <Star className="size-4 fill-primary text-primary" key={index} />
      ))}
    </div>
  );
}

export function SectionFrame({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "contrast" | "default" | "muted" | undefined;
}) {
  const className =
    variant === "contrast"
      ? "bg-primary text-primary-foreground"
      : variant === "muted"
        ? "bg-muted/40"
        : undefined;

  return (
    <Section className={className}>
      <Container>{children}</Container>
    </Section>
  );
}
