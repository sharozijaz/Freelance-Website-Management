import { describe, expect, it } from "vitest";
import { BlockRegistry } from "./registry";
import { normalizePayloadBlock, normalizePayloadBlocks } from "./payload-block-adapter";
import type { BlockDefinition } from "./types";

function TestBlock() {
  return null;
}

const testDefinition: BlockDefinition = {
  category: "content",
  component: TestBlock,
  icon: "test",
  id: "test.hero.v1",
  name: "Hero",
  previewImagePlaceholder: "/preview.svg",
  schema: {},
  type: "hero",
  version: 1,
};

describe("Payload block adapter", () => {
  it("wraps flat Payload block data in the renderer content contract", () => {
    const block = normalizePayloadBlock(
      {
        blockType: "hero",
        headline: "Hello",
        id: "hero-1",
        trustIndicators: [{ label: "Fast" }, { label: "Reusable" }],
      },
      0,
    );

    expect(block).toMatchObject({
      content: {
        headline: "Hello",
        trustIndicators: ["Fast", "Reusable"],
      },
      id: "hero-1",
      type: "hero",
    });
  });

  it("normalizes pricing feature labels without coupling to Payload types", () => {
    const [block] = normalizePayloadBlocks([
      {
        blockType: "pricing",
        plans: [
          {
            features: [{ label: "SEO setup" }, { label: "CMS editing" }],
            name: "Growth",
          },
        ],
      },
    ]);

    expect(block?.content).toMatchObject({
      plans: [
        {
          features: ["SEO setup", "CMS editing"],
          name: "Growth",
        },
      ],
    });
  });

  it("lets the registry return null for unknown block types", () => {
    const registry = new BlockRegistry([testDefinition]);

    expect(registry.get("hero")).toBe(testDefinition);
    expect(registry.get("unknown-section")).toBeNull();
  });
});
