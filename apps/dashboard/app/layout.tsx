import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getDashboardShellData } from "@/lib/dashboard/queries";
import { getDashboardSessionContext } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sharoz Platform",
    template: "%s | Sharoz Platform",
  },
  description: "Agency operations dashboard for managed client websites.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const context = await getDashboardSessionContext();
  const shellData = context
    ? await getDashboardShellData({
        database,
        request: createDashboardRequest(context),
      })
    : { accessibleOrganizations: [], activeOrganization: null };

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <DashboardShell
          activeOrganization={shellData.activeOrganization}
          context={context}
          organizations={shellData.accessibleOrganizations}
        >
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
