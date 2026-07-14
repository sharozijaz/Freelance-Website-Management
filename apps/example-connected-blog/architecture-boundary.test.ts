import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function sourceFiles(dir = root): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if ([".next", "node_modules"].includes(entry)) {
        return [];
      }

      return sourceFiles(path);
    }

    if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) {
      return [];
    }

    return /\.(ts|tsx|js|jsx)$/.test(entry) ? [path] : [];
  });
}

function sourceText() {
  return sourceFiles()
    .map((file) => `\n// ${relative(root, file)}\n${readFileSync(file, "utf8")}`)
    .join("\n");
}

describe("connected Blog example boundary", () => {
  it("uses @sharoz/sdk and avoids platform internals", () => {
    const text = sourceText();

    expect(text).toContain('@sharoz/sdk";');
    expect(text).not.toMatch(/@agency\/database|drizzle-orm|payload|better-auth/);
    expect(text).not.toMatch(/apps\/dashboard|lib\/dashboard|lib\/platform-api/);
  });

  it("keeps credentials server-side and out of browser storage/query patterns", () => {
    const text = sourceText();

    expect(text).toContain("SHAROZ_SECRET");
    expect(text).not.toContain("NEXT_PUBLIC_SHAROZ_SECRET");
    expect(text).not.toContain("NEXT_PUBLIC_SHAROZ_PUBLIC_KEY");
    expect(text).not.toMatch(/localStorage|sessionStorage/);
    expect(text).not.toMatch(/secret=.*SHAROZ|publicKey=.*SHAROZ/);
  });
});
