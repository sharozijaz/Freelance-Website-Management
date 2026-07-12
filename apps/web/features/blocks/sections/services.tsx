import { Card, CardContent, CardFooter, CardHeader, CardTitle, Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import {
  CtaButton,
  ResponsiveMedia,
  SectionFrame,
  SectionHeader,
  type SectionCta,
  type SectionMedia,
} from "./shared";

export interface ServiceItem {
  cta?: SectionCta;
  description?: string;
  image?: SectionMedia;
  title?: string;
}

export interface ServicesContent extends Record<string, unknown> {
  headline?: string;
  items?: ServiceItem[];
  text?: string;
}

export const servicesDefaults: ServicesContent = {
  headline: "Services",
  items: [],
};

export const servicesSchema: BlockSchema = {
  content: {
    headline: "text",
    items: "array",
    text: "textarea",
  },
};

export function ServicesSection({ block }: BlockComponentProps<ServicesContent>) {
  const content = { ...servicesDefaults, ...block.content };

  return (
    <SectionFrame>
      <SectionHeader headline={content.headline ?? ""} text={content.text} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {(content.items ?? []).map((item, index) => (
          <Card key={`${item.title ?? "service"}-${index.toString()}`}>
            <ResponsiveMedia
              className="aspect-video w-full rounded-t-md object-cover"
              image={item.image}
            />
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {item.description ? (
                <Text className="text-muted-foreground">{item.description}</Text>
              ) : null}
            </CardContent>
            <CardFooter>
              <CtaButton cta={item.cta} variant="outline" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </SectionFrame>
  );
}

export const servicesDefinition: BlockDefinition<ServicesContent> = {
  category: "content",
  component: ServicesSection,
  icon: "briefcase",
  id: "starter.services.v1",
  name: "Services",
  previewImagePlaceholder: "/block-previews/services.svg",
  schema: servicesSchema,
  type: "services",
  version: 1,
};
