import { Badge, Card, CardContent, CardFooter, CardHeader, CardTitle, Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { CtaButton, FeatureCheck, SectionFrame, SectionHeader, type SectionCta } from "./shared";

export interface PricingPlan {
  cta?: SectionCta;
  description?: string;
  features?: string[];
  highlighted?: boolean;
  name?: string;
  price?: string;
}

export interface PricingContent extends Record<string, unknown> {
  headline?: string;
  plans?: PricingPlan[];
  text?: string;
}

export const pricingDefaults: PricingContent = {
  headline: "Simple pricing",
  plans: [],
};

export const pricingSchema: BlockSchema = {
  content: {
    headline: "text",
    plans: "array",
    text: "textarea",
  },
};

export function PricingSection({ block }: BlockComponentProps<PricingContent>) {
  const content = { ...pricingDefaults, ...block.content };

  return (
    <SectionFrame>
      <SectionHeader headline={content.headline ?? ""} text={content.text} />
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {(content.plans ?? []).map((plan, index) => (
          <Card
            className={plan.highlighted ? "border-primary shadow-md" : undefined}
            key={`${plan.name ?? "plan"}-${index.toString()}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{plan.name}</CardTitle>
                {plan.highlighted ? <Badge>Popular</Badge> : null}
              </div>
              {plan.description ? (
                <Text className="text-muted-foreground">{plan.description}</Text>
              ) : null}
              {plan.price ? (
                <div className="font-display text-4xl font-semibold">{plan.price}</div>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(plan.features ?? []).map((feature) => (
                  <FeatureCheck key={feature}>{feature}</FeatureCheck>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <CtaButton cta={plan.cta} variant={plan.highlighted ? "primary" : "outline"} />
            </CardFooter>
          </Card>
        ))}
      </div>
    </SectionFrame>
  );
}

export const pricingDefinition: BlockDefinition<PricingContent> = {
  category: "conversion",
  component: PricingSection,
  icon: "badge-dollar-sign",
  id: "starter.pricing.v1",
  name: "Pricing",
  previewImagePlaceholder: "/block-previews/pricing.svg",
  schema: pricingSchema,
  type: "pricing",
  version: 1,
};
