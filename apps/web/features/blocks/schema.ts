import type { BlockSchema } from "./types";

export const baseBlockSchema: BlockSchema = {
  content: {
    description: "Block-specific content fields registered by the block implementation.",
    type: "object",
  },
  settings: {
    properties: {
      animation: {
        type: "object",
      },
      responsive: {
        type: "object",
      },
      theme: {
        type: "object",
      },
      visibility: {
        type: "array",
      },
    },
    type: "object",
  },
};
