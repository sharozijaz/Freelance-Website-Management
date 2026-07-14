import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardRoot = process.cwd();
const scannedRoots = ["app", "lib"];
const blockedPatterns = [/NEXT_PUBLIC_CMS_URL/, /localhost:3001/, /localhost:3002/];

function files(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      if (entry === ".next" || entry === "node_modules") return [];
      return files(path);
    }

    return /\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")
      ? [path]
      : [];
  });
}

describe("legacy CMS dashboard boundary", () => {
  it("does not require legacy CMS URL configuration in dashboard runtime code", () => {
    const matches = scannedRoots.flatMap((root) =>
      files(join(dashboardRoot, root)).flatMap((filePath) => {
        const text = readFileSync(filePath, "utf8");
        return blockedPatterns.some((pattern) => pattern.test(text)) ? [filePath] : [];
      }),
    );

    expect(matches).toEqual([]);
  });

  it("keeps content navigation on V2 dashboard routes", () => {
    const contentPage = readFileSync(join(dashboardRoot, "app/content/page.tsx"), "utf8");

    expect(contentPage).toContain('href="/media"');
    expect(contentPage).toContain('href="/forms"');
    expect(contentPage).not.toContain("/admin/collections");
  });
});
