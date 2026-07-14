import { Mail, Phone } from "lucide-react";
import { Card, CardContent, Text } from "@agency/ui";
import { FormById, FormRenderer, type WebsiteFormDefinition } from "@/features/forms";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { SectionFrame, SectionHeader } from "./shared";

export interface ContactContent extends Record<string, unknown> {
  email?: string;
  form?: WebsiteFormDefinition;
  formId?: string;
  headline?: string;
  phone?: string;
  text?: string;
}

export const contactSchema: BlockSchema = {
  content: {
    email: "text",
    form: "relationship:forms",
    formId: "text",
    headline: "text",
    phone: "text",
    text: "textarea",
  },
};

export function ContactSection({ block }: BlockComponentProps<ContactContent>) {
  const content = block.content ?? {};

  return (
    <SectionFrame>
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="space-y-6">
          <SectionHeader
            headline={content.headline ?? "Contact us"}
            text={content.text ?? "Send a message and the team will follow up."}
          />
          <div className="space-y-3 text-sm">
            {content.email ? (
              <a
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                href={`mailto:${content.email}`}
              >
                <Mail className="size-4" />
                {content.email}
              </a>
            ) : null}
            {content.phone ? (
              <a
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                href={`tel:${content.phone}`}
              >
                <Phone className="size-4" />
                {content.phone}
              </a>
            ) : null}
          </div>
        </div>

        <Card>
          <CardContent className="p-5">
            {content.form ? (
              <FormRenderer form={content.form} />
            ) : content.formId ? (
              <FormById formId={content.formId} />
            ) : (
              <Text className="text-muted-foreground">
                Use the contact details on this page to reach the team.
              </Text>
            )}
          </CardContent>
        </Card>
      </div>
    </SectionFrame>
  );
}

export const contactDefinition: BlockDefinition<ContactContent> = {
  category: "conversion",
  component: ContactSection,
  icon: "mail",
  id: "starter.contact.v1",
  name: "Contact",
  previewImagePlaceholder: "/block-previews/contact.svg",
  schema: contactSchema,
  type: "contact",
  version: 1,
};
