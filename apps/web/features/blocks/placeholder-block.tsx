import { Badge, Container, Section, Stack, Text } from "@agency/ui";
import type { BlockComponentProps } from "./types";

export function PlaceholderBlock({ block }: BlockComponentProps) {
  return (
    <Section>
      <Container>
        <Stack className="rounded-md border border-dashed p-6" gap="sm">
          <Badge>{block.type}</Badge>
          <Text className="font-medium">Registered block placeholder</Text>
          <Text className="text-muted-foreground" size="sm">
            This block type is registered in the Block Engine. Its visual section component will be
            added in a future section-library milestone.
          </Text>
        </Stack>
      </Container>
    </Section>
  );
}

export function UnknownBlock({ block }: BlockComponentProps) {
  return (
    <Section>
      <Container>
        <Stack className="rounded-md border border-destructive/40 p-6" gap="sm">
          <Badge variant="error">Unknown block</Badge>
          <Text className="font-medium">No renderer registered for `{block.type}`</Text>
          <Text className="text-muted-foreground" size="sm">
            The page contains block data that is not present in the registry.
          </Text>
        </Stack>
      </Container>
    </Section>
  );
}
