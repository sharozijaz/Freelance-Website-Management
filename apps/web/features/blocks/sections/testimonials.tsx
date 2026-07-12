import { Card, CardContent, CardHeader, Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { Rating, ResponsiveMedia, SectionFrame, SectionHeader, type SectionMedia } from "./shared";

export interface TestimonialItem {
  avatar?: SectionMedia;
  company?: string;
  name?: string;
  quote?: string;
  rating?: number;
}

export interface TestimonialsContent extends Record<string, unknown> {
  headline?: string;
  items?: TestimonialItem[];
  text?: string;
}

export const testimonialsDefaults: TestimonialsContent = {
  headline: "What clients say",
  items: [],
};

export const testimonialsSchema: BlockSchema = {
  content: {
    headline: "text",
    items: "array",
    text: "textarea",
  },
};

export function TestimonialsSection({ block }: BlockComponentProps<TestimonialsContent>) {
  const content = { ...testimonialsDefaults, ...block.content };

  return (
    <SectionFrame>
      <SectionHeader headline={content.headline ?? ""} text={content.text} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {(content.items ?? []).map((item, index) => (
          <Card key={`${item.name ?? "testimonial"}-${index.toString()}`}>
            <CardHeader>
              <Rating value={item.rating} />
            </CardHeader>
            <CardContent className="space-y-5">
              {item.quote ? (
                <blockquote className="text-lg leading-relaxed">“{item.quote}”</blockquote>
              ) : null}
              <div className="flex items-center gap-3">
                <ResponsiveMedia
                  className="size-10 rounded-full object-cover"
                  image={item.avatar}
                />
                <div>
                  <Text className="font-medium">{item.name}</Text>
                  {item.company ? (
                    <Text className="text-muted-foreground" size="sm">
                      {item.company}
                    </Text>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionFrame>
  );
}

export const testimonialsDefinition: BlockDefinition<TestimonialsContent> = {
  category: "social-proof",
  component: TestimonialsSection,
  icon: "quote",
  id: "starter.testimonials.v1",
  name: "Testimonials",
  previewImagePlaceholder: "/block-previews/testimonials.svg",
  schema: testimonialsSchema,
  type: "testimonials",
  version: 1,
};
