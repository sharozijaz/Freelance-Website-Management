import { Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { CtaButton, SectionFrame, type SectionCta } from "./shared";

export interface CtaContent extends Record<string, unknown> {
  backgroundVariant?: "contrast" | "default" | "muted";
  buttons?: SectionCta[];
  headline?: string;
  text?: string;
}

export const ctaDefaults: CtaContent = {
  backgroundVariant: "contrast",
  headline: "Ready to launch the next client site?",
};

export const ctaSchema: BlockSchema = {
  content: {
    backgroundVariant: "select",
    buttons: "array",
    headline: "text",
    text: "textarea",
  },
};

export function CtaSection({ block }: BlockComponentProps<CtaContent>) {
  const content = { ...ctaDefaults, ...block.content };

  return (
    <SectionFrame variant={content.backgroundVariant}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 py-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-normal md:text-5xl">
          {content.headline}
        </h2>
        {content.text ? <Text size="lg">{content.text}</Text> : null}
        <div className="flex flex-wrap justify-center gap-3">
          {(content.buttons ?? []).map((button, index) => (
            <CtaButton
              cta={button}
              key={`${button.label ?? "button"}-${index.toString()}`}
              variant={index === 0 ? "secondary" : "outline"}
            />
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

export const ctaDefinition: BlockDefinition<CtaContent> = {
  category: "conversion",
  component: CtaSection,
  icon: "mouse-pointer-click",
  id: "starter.cta.v1",
  name: "CTA",
  previewImagePlaceholder: "/block-previews/cta.svg",
  schema: ctaSchema,
  type: "cta",
  version: 1,
};
