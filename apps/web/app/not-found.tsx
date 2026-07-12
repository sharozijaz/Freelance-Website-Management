import Link from "next/link";
import { Button, EmptyState, Section } from "@agency/ui";

export default function NotFound() {
  return (
    <Section>
      <EmptyState
        action={
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        }
        description="The content for this route was not found."
        title="Page not found"
      />
    </Section>
  );
}
