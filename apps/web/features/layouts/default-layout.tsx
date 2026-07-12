import { Container, Heading, Section, Stack, Text } from "@agency/ui";
import { BlockRenderer } from "../renderer/block-renderer";
import type { PageRenderInput } from "../renderer/types";

export function DefaultLayout({ context, page }: PageRenderInput) {
  return (
    <main>
      <Section>
        <Container>
          <Stack gap="md">
            <Heading>{page.title}</Heading>
            {page.seo?.metaDescription ? <Text>{page.seo.metaDescription}</Text> : null}
          </Stack>
        </Container>
      </Section>
      <BlockRenderer blocks={page.layout} context={context} />
    </main>
  );
}
