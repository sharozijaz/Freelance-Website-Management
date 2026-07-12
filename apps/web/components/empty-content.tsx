import { EmptyState, Section } from "@agency/ui";

export function EmptyContent({
  description = "There is no content available for this tenant yet.",
  title = "No content",
}: {
  description?: string;
  title?: string;
}) {
  return (
    <Section>
      <EmptyState description={description} title={title} />
    </Section>
  );
}
