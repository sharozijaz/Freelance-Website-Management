import { Fragment } from "react";
import { EmptyState, Section } from "@agency/ui";
import { UnknownBlock } from "./placeholder-block";
import { blockRegistry } from "./registry";
import type { CmsBlock } from "./types";
import type { RenderContext } from "../renderer/types";

interface BlocksRendererProps {
  blocks?: CmsBlock[] | undefined;
  context: RenderContext;
}

export function BlocksRenderer({ blocks, context }: BlocksRendererProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <Section>
        <EmptyState
          description="This page is ready for content from the future visual page builder."
          title="No page sections yet"
        />
      </Section>
    );
  }

  return (
    <>
      {blocks.map((block) => {
        const definition = blockRegistry.get(block.type);
        const Component = definition?.component ?? UnknownBlock;

        return (
          <Fragment key={block.id}>
            <Component block={block} context={context} />
          </Fragment>
        );
      })}
    </>
  );
}
