"use client";

import { Button, EmptyState, Section } from "@agency/ui";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Section>
      <EmptyState
        action={<Button onClick={reset}>Try again</Button>}
        description="The website renderer could not load this content."
        title="Something went wrong"
      />
    </Section>
  );
}
