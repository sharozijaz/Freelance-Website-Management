import { Container, Heading, Section, Stack, Text } from "@agency/ui";
import { BlockRenderer } from "../renderer/block-renderer";
import type { PageRenderInput } from "../renderer/types";

export function LandingLayout({ context, page }: PageRenderInput) {
  return (
    <main>
      <Section className="min-h-[55vh]">
        <Container>
          <Stack gap="md">
            <Heading>{page.title}</Heading>
            <Text className="max-w-2xl text-muted-foreground">
              {page.seo?.metaDescription ?? "This tenant website is ready for CMS-driven sections."}
            </Text>
          </Stack>
        </Container>
      </Section>
      <BlockRenderer blocks={page.layout} context={context} />
    </main>
  );
}
