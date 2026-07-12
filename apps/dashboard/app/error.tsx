"use client";

import { Button, EmptyState } from "@agency/ui";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <EmptyState
        action={<Button onClick={reset}>Try again</Button>}
        description="The dashboard could not load this operation. The action was not completed."
        title="Dashboard error"
      />
    </main>
  );
}
