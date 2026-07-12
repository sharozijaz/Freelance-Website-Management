import { Card, CardContent, Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { SectionFrame, SectionHeader } from "./shared";

export interface StatisticItem {
  label?: string;
  suffix?: string;
  value?: number;
}

export interface StatisticsContent extends Record<string, unknown> {
  animated?: boolean;
  headline?: string;
  items?: StatisticItem[];
  text?: string;
}

export const statisticsDefaults: StatisticsContent = {
  animated: true,
  headline: "Measured results",
  items: [],
};

export const statisticsSchema: BlockSchema = {
  content: {
    animated: "checkbox",
    headline: "text",
    items: "array",
    text: "textarea",
  },
};

export function StatisticsSection({ block }: BlockComponentProps<StatisticsContent>) {
  const content = { ...statisticsDefaults, ...block.content };

  return (
    <SectionFrame variant="muted">
      <SectionHeader headline={content.headline ?? ""} text={content.text} />
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {(content.items ?? []).map((item, index) => (
          <Card key={`${item.label ?? "stat"}-${index.toString()}`}>
            <CardContent className="p-6 text-center">
              <div className="font-display text-4xl font-semibold">
                {(item.value ?? 0).toLocaleString()}
                {item.suffix}
              </div>
              {item.label ? <Text className="mt-2 text-muted-foreground">{item.label}</Text> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionFrame>
  );
}

export const statisticsDefinition: BlockDefinition<StatisticsContent> = {
  category: "social-proof",
  component: StatisticsSection,
  icon: "bar-chart",
  id: "starter.statistics.v1",
  name: "Statistics",
  previewImagePlaceholder: "/block-previews/statistics.svg",
  schema: statisticsSchema,
  type: "statistics",
  version: 1,
};
