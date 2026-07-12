import { BlocksRenderer } from "../blocks";
import { normalizePayloadBlocks } from "../blocks/payload-block-adapter";
import type { RenderContext } from "./types";

interface BlockRendererProps {
  blocks?: unknown[] | undefined;
  context: RenderContext;
}

export function BlockRenderer({ blocks, context }: BlockRendererProps) {
  return <BlocksRenderer blocks={normalizePayloadBlocks(blocks)} context={context} />;
}
