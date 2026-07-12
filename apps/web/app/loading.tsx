import { Container, Section, Skeleton, Stack } from "@agency/ui";

export default function Loading() {
  return (
    <Section>
      <Container>
        <Stack gap="md">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </Stack>
      </Container>
    </Section>
  );
}
