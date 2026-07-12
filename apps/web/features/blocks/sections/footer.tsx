import NextLink from "next/link";
import { Divider, Stack, Text } from "@agency/ui";
import type { BlockComponentProps, BlockDefinition, BlockSchema } from "../types";
import { ResponsiveMedia, SectionFrame, type SectionMedia } from "./shared";

export interface FooterLink {
  label?: string;
  url?: string;
}

export interface FooterContent extends Record<string, unknown> {
  contact?: string;
  copyright?: string;
  logo?: SectionMedia;
  navigation?: FooterLink[];
  socialLinks?: FooterLink[];
}

export const footerDefaults: FooterContent = {
  copyright: "All rights reserved.",
  navigation: [],
  socialLinks: [],
};

export const footerSchema: BlockSchema = {
  content: {
    contact: "textarea",
    copyright: "text",
    logo: "media",
    navigation: "array",
    socialLinks: "array",
  },
};

export function FooterSection({ block }: BlockComponentProps<FooterContent>) {
  const content = { ...footerDefaults, ...block.content };

  return (
    <SectionFrame variant="muted">
      <Stack gap="lg">
        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <Stack gap="sm">
            <ResponsiveMedia className="max-h-12 w-fit object-contain" image={content.logo} />
            {content.contact ? (
              <Text className="text-muted-foreground">{content.contact}</Text>
            ) : null}
          </Stack>
          <div className="grid gap-6 sm:grid-cols-2">
            <nav aria-label="Footer section navigation" className="flex flex-col gap-2">
              {(content.navigation ?? []).map((link) =>
                link.url && link.label ? (
                  <NextLink
                    className="text-sm text-muted-foreground hover:text-foreground"
                    href={link.url}
                    key={link.label}
                  >
                    {link.label}
                  </NextLink>
                ) : null,
              )}
            </nav>
            <nav aria-label="Social links" className="flex flex-col gap-2">
              {(content.socialLinks ?? []).map((link) =>
                link.url && link.label ? (
                  <NextLink
                    className="text-sm text-muted-foreground hover:text-foreground"
                    href={link.url}
                    key={link.label}
                  >
                    {link.label}
                  </NextLink>
                ) : null,
              )}
            </nav>
          </div>
        </div>
        <Divider />
        <Text className="text-muted-foreground" size="sm">
          {content.copyright}
        </Text>
      </Stack>
    </SectionFrame>
  );
}

export const footerDefinition: BlockDefinition<FooterContent> = {
  category: "navigation",
  component: FooterSection,
  icon: "panel-bottom",
  id: "starter.footer.v1",
  name: "Footer",
  previewImagePlaceholder: "/block-previews/footer.svg",
  schema: footerSchema,
  type: "footer",
  version: 1,
};
