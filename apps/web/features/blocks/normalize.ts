import { blockTypes, type BlockType, type BlockVisibilityRule, type CmsBlock } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isBlockType(value: unknown): value is string {
  return typeof value === "string";
}

function isVisibilityRule(value: unknown): value is BlockVisibilityRule {
  if (!isRecord(value)) {
    return false;
  }

  const { field, operator } = value;

  return (
    typeof field === "string" &&
    (operator === "equals" || operator === "exists" || operator === "not_equals")
  );
}

export function normalizeBlock(value: unknown, index: number): CmsBlock | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = value.type ?? value.blockType;

  if (!isBlockType(type)) {
    return null;
  }

  const block: CmsBlock = {
    id: typeof value.id === "string" ? value.id : `${type}-${index.toString()}`,
    type,
  };

  if (isRecord(value.animation)) {
    block.animation = value.animation;
  }

  if (isRecord(value.content)) {
    block.content = value.content;
  }

  if (isRecord(value.responsive)) {
    block.responsive = value.responsive;
  }

  if (isRecord(value.seo)) {
    block.seo = value.seo;
  }

  if (isRecord(value.settings)) {
    block.settings = value.settings;
  }

  if (isRecord(value.theme)) {
    block.theme = value.theme;
  }

  if (Array.isArray(value.visibility)) {
    block.visibility = value.visibility.filter(isVisibilityRule);
  }

  return block;
}

export function normalizeBlocks(values?: unknown[]): CmsBlock[] {
  return values?.map(normalizeBlock).filter((block): block is CmsBlock => Boolean(block)) ?? [];
}

export function isSupportedCoreBlockType(type: string): type is BlockType {
  return blockTypes.includes(type as BlockType);
}
