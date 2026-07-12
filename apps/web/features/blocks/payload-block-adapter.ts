import { normalizeBlock } from "./normalize";
import type { CmsBlock } from "./types";

const payloadMetadataFields = new Set([
  "animation",
  "blockName",
  "blockType",
  "content",
  "id",
  "responsive",
  "seo",
  "settings",
  "theme",
  "type",
  "visibility",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function labelArrayToStrings(value: unknown): string[] {
  const items = toUnknownArray(value);

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (isRecord(item) && typeof item.label === "string") {
        return item.label;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function toUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : [];
}

function normalizeLogoCloudContent(content: Record<string, unknown>): Record<string, unknown> {
  return {
    ...content,
    logos:
      toUnknownArray(content.logos).length > 0
        ? toUnknownArray(content.logos).map((logo) => {
            if (!isRecord(logo)) {
              return logo;
            }

            return isRecord(logo.image)
              ? {
                  ...logo.image,
                  name: logo.name,
                }
              : logo;
          })
        : content.logos,
  };
}

function normalizeHeroContent(content: Record<string, unknown>): Record<string, unknown> {
  return {
    ...content,
    trustIndicators: labelArrayToStrings(content.trustIndicators),
  };
}

function normalizePricingContent(content: Record<string, unknown>): Record<string, unknown> {
  return {
    ...content,
    plans:
      toUnknownArray(content.plans).length > 0
        ? toUnknownArray(content.plans).map((plan) => {
            if (!isRecord(plan)) {
              return plan;
            }

            return {
              ...plan,
              features: labelArrayToStrings(plan.features),
            };
          })
        : content.plans,
  };
}

function normalizeContentForBlock(
  blockType: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  switch (blockType) {
    case "hero":
      return normalizeHeroContent(content);
    case "logo-cloud":
      return normalizeLogoCloudContent(content);
    case "pricing":
      return normalizePricingContent(content);
    default:
      return content;
  }
}

function extractPayloadContent(value: Record<string, unknown>): Record<string, unknown> {
  const content: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(value)) {
    if (!payloadMetadataFields.has(key)) {
      content[key] = fieldValue;
    }
  }

  return content;
}

export function normalizePayloadBlock(value: unknown, index: number): CmsBlock | null {
  if (!isRecord(value)) {
    return null;
  }

  const blockType = value.type ?? value.blockType;

  if (typeof blockType !== "string") {
    return null;
  }

  if (isRecord(value.content)) {
    return normalizeBlock(value, index);
  }

  return normalizeBlock(
    {
      animation: value.animation,
      content: normalizeContentForBlock(blockType, extractPayloadContent(value)),
      id: typeof value.id === "string" ? value.id : `${blockType}-${index.toString()}`,
      responsive: value.responsive,
      seo: value.seo,
      settings: value.settings,
      theme: value.theme,
      type: blockType,
      visibility: value.visibility,
    },
    index,
  );
}

export function normalizePayloadBlocks(values?: unknown[]): CmsBlock[] {
  return (
    values?.map(normalizePayloadBlock).filter((block): block is CmsBlock => Boolean(block)) ?? []
  );
}
