import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  description: "Minimal Sharoz Connected Blog example using @sharoz/sdk.",
  title: "Connected Blog Example",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="site-shell">
          <header className="site-header">
            <Link href="/blog">Connected Blog</Link>
            <Link href="/media">Media</Link>
            <Link href="/contact">Contact</Link>
            <span className="muted">Custom website-owned UI</span>
          </header>
          {children}
          <footer className="site-footer">
            <span>Powered by Sharoz Platform API</span>
          </footer>
        </main>
      </body>
    </html>
  );
}
