import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { SectionFrame, SectionHeader } from "./shared";

export interface FaqItem {
  answer?: string;
  category?: string;
  question?: string;
}

export interface FaqContent extends Record<string, unknown> {
  categoriesEnabled?: boolean;
  headline?: string;
  items?: FaqItem[];
  text?: string;
}

export const faqDefaults: FaqContent = {
  headline: "Frequently asked questions",
  items: [],
};

export const faqSchema: BlockSchema = {
  content: {
    categoriesEnabled: "checkbox",
    headline: "text",
    items: "array",
    text: "textarea",
  },
};

export function FaqSection({ block }: BlockComponentProps<FaqContent>) {
  const content = { ...faqDefaults, ...block.content };

  return (
    <SectionFrame>
      <SectionHeader headline={content.headline ?? ""} text={content.text} />
      <Accordion className="mx-auto mt-10 max-w-3xl" collapsible type="single">
        {(content.items ?? []).map((item, index) => (
          <AccordionItem
            key={`${item.question ?? "faq"}-${index.toString()}`}
            value={index.toString()}
          >
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionFrame>
  );
}

export const faqDefinition: BlockDefinition<FaqContent> = {
  category: "content",
  component: FaqSection,
  icon: "circle-help",
  id: "starter.faq.v1",
  name: "FAQ",
  previewImagePlaceholder: "/block-previews/faq.svg",
  schema: faqSchema,
  type: "faq",
  version: 1,
};
