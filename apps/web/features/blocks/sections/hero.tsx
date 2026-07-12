import { Badge, Stack, Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import {
  CtaButton,
  ResponsiveMedia,
  SectionFrame,
  type SectionCta,
  type SectionMedia,
} from "./shared";

export interface HeroContent extends Record<string, unknown> {
  backgroundImage?: SectionMedia;
  badge?: string;
  headline?: string;
  heroImage?: SectionMedia;
  primaryCta?: SectionCta;
  secondaryCta?: SectionCta;
  subheadline?: string;
  trustIndicators?: string[];
  videoBackgroundUrl?: string;
}

export const heroDefaults: HeroContent = {
  badge: "Agency Website Platform",
  headline: "Launch a polished client website from reusable sections.",
  primaryCta: { label: "Get started", url: "/" },
  secondaryCta: { label: "Learn more", url: "/" },
  subheadline: "A CMS-driven section system for fast, consistent client delivery.",
  trustIndicators: ["Theme-aware", "CMS-ready", "Reusable"],
};

export const heroSchema: BlockSchema = {
  content: {
    backgroundImage: "media",
    badge: "text",
    headline: "text",
    heroImage: "media",
    primaryCta: "link",
    secondaryCta: "link",
    subheadline: "textarea",
    trustIndicators: "array",
    videoBackgroundUrl: "text",
  },
};

export function HeroSection({ block }: BlockComponentProps<HeroContent>) {
  const content = { ...heroDefaults, ...block.content };

  return (
    <SectionFrame>
      <div className="relative overflow-hidden rounded-md">
        {content.backgroundImage ? (
          <ResponsiveMedia
            className="absolute inset-0 size-full object-cover opacity-15"
            image={content.backgroundImage}
            priority
          />
        ) : null}
        {content.videoBackgroundUrl ? (
          <video
            aria-hidden="true"
            autoPlay
            className="absolute inset-0 size-full object-cover opacity-15"
            loop
            muted
            playsInline
          >
            <source src={content.videoBackgroundUrl} />
          </video>
        ) : null}
        <div className="relative z-10 grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Stack gap="lg">
            {content.badge ? <Badge className="w-fit">{content.badge}</Badge> : null}
            <Stack gap="md">
              <h1 className="max-w-4xl font-display text-4xl font-semibold tracking-normal md:text-6xl">
                {content.headline}
              </h1>
              {content.subheadline ? (
                <Text className="max-w-2xl text-muted-foreground" size="lg">
                  {content.subheadline}
                </Text>
              ) : null}
            </Stack>
            <div className="flex flex-wrap gap-3">
              <CtaButton cta={content.primaryCta} />
              <CtaButton cta={content.secondaryCta} variant="outline" />
            </div>
            {content.trustIndicators?.length ? (
              <div className="flex flex-wrap gap-2">
                {content.trustIndicators.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            ) : null}
          </Stack>
          {content.heroImage ? (
            <ResponsiveMedia
              className="aspect-[4/3] w-full rounded-md border object-cover shadow-lg"
              image={content.heroImage}
              priority
            />
          ) : null}
        </div>
      </div>
    </SectionFrame>
  );
}

export const heroDefinition: BlockDefinition<HeroContent> = {
  category: "conversion",
  component: HeroSection,
  icon: "panel-top",
  id: "starter.hero.v1",
  name: "Hero",
  previewImagePlaceholder: "/block-previews/hero.svg",
  schema: heroSchema,
  type: "hero",
  version: 1,
};
