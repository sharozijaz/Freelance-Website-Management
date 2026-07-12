import { Card, CardContent, Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { ResponsiveMedia, SectionFrame, SectionHeader, type SectionMedia } from "./shared";

export interface LogoCloudContent extends Record<string, unknown> {
  carouselReady?: boolean;
  headline?: string;
  logos?: (SectionMedia & { name?: string })[];
}

export const logoCloudDefaults: LogoCloudContent = {
  headline: "Trusted by growing teams",
  logos: [],
};

export const logoCloudSchema: BlockSchema = {
  content: {
    carouselReady: "checkbox",
    headline: "text",
    logos: "array",
  },
};

export function LogoCloudSection({ block }: BlockComponentProps<LogoCloudContent>) {
  const content = { ...logoCloudDefaults, ...block.content };

  return (
    <SectionFrame variant="muted">
      <div className="py-4">
        <SectionHeader headline={content.headline ?? "Trusted by growing teams"} />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {(content.logos ?? []).map((logo, index) => (
            <Card key={`${logo.name ?? "logo"}-${index.toString()}`}>
              <CardContent className="flex h-24 items-center justify-center p-4">
                <ResponsiveMedia className="max-h-12 w-auto object-contain" image={logo} />
                {!logo.url && !logo.media ? <Text size="sm">{logo.name ?? "Logo"}</Text> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

export const logoCloudDefinition: BlockDefinition<LogoCloudContent> = {
  category: "social-proof",
  component: LogoCloudSection,
  icon: "badge-check",
  id: "starter.logo-cloud.v1",
  name: "Logo Cloud",
  previewImagePlaceholder: "/block-previews/logo-cloud.svg",
  schema: logoCloudSchema,
  type: "logo-cloud",
  version: 1,
};
