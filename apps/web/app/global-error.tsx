"use client";

import type { ReactNode } from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="p-8">
          <h1>Website error</h1>
          <p>The website renderer encountered an unexpected error.</p>
          <button onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

export function ErrorSlot({ children }: { children: ReactNode }) {
  return children;
}
