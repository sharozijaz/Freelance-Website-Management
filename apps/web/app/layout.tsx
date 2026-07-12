import type { Metadata } from "next";
import type { ReactNode } from "react";
import { resolveTenant } from "@/lib/tenant";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  description: "Reusable website renderer for the Agency Website Platform.",
  title: "Agency Website",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const tenant = resolveTenant();

  return (
    <html lang="en">
      <body>
        <SiteShell tenant={tenant}>{children}</SiteShell>
      </body>
    </html>
  );
}
