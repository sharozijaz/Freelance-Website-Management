import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agency Dashboard",
  description: "Dashboard foundation for the Agency Website Platform.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
          <aside className="border-r bg-muted p-4">Sidebar placeholder</aside>
          <div>
            <header className="border-b p-4">Header placeholder</header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
