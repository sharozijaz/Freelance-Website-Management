import { ArrowRight, Sparkles } from "lucide-react";
import NextLink from "next/link";
import { Card, CardContent, CardHeader, CardTitle, IconFrame, Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { SectionFrame, SectionHeader } from "./shared";

export interface FeatureItem {
  description?: string;
  icon?: string;
  link?: { label?: string; url?: string };
  title?: string;
}

export interface FeaturesContent extends Record<string, unknown> {
  eyebrow?: string;
  headline?: string;
  items?: FeatureItem[];
  text?: string;
}

export const featuresDefaults: FeaturesContent = {
  headline: "Reusable features for every client site",
  items: [],
};

export const featuresSchema: BlockSchema = {
  content: {
    eyebrow: "text",
    headline: "text",
    items: "array",
    text: "textarea",
  },
};

export function FeaturesSection({ block }: BlockComponentProps<FeaturesContent>) {
  const content = { ...featuresDefaults, ...block.content };

  return (
    <SectionFrame>
      <SectionHeader
        eyebrow={content.eyebrow}
        headline={content.headline ?? ""}
        text={content.text}
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(content.items ?? []).map((item, index) => (
          <Card key={`${item.title ?? "feature"}-${index.toString()}`}>
            <CardHeader>
              <IconFrame>
                <Sparkles className="size-5" aria-hidden />
              </IconFrame>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.description ? (
                <Text className="text-muted-foreground">{item.description}</Text>
              ) : null}
              {item.link?.url && item.link.label ? (
                <NextLink
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                  href={item.link.url}
                >
                  {item.link.label}
                  <ArrowRight className="size-4" />
                </NextLink>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionFrame>
  );
}

export const featuresDefinition: BlockDefinition<FeaturesContent> = {
  category: "content",
  component: FeaturesSection,
  icon: "list-checks",
  id: "starter.features.v1",
  name: "Feature Grid",
  previewImagePlaceholder: "/block-previews/features.svg",
  schema: featuresSchema,
  type: "features",
  version: 1,
};
