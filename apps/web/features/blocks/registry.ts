import { coreBlockDefinitions } from "./definitions";
import type { BlockDefinition, BlockType } from "./types";

export class BlockRegistry {
  private readonly definitions = new Map<BlockType, BlockDefinition>();

  constructor(definitions: BlockDefinition[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  get(type: string): BlockDefinition | null {
    return this.definitions.get(type as BlockType) ?? null;
  }

  list(): BlockDefinition[] {
    return Array.from(this.definitions.values());
  }

  register(definition: BlockDefinition): void {
    const existing = this.definitions.get(definition.type);

    if (existing && existing.id !== definition.id) {
      throw new Error(`Block type "${definition.type}" is already registered.`);
    }

    this.definitions.set(definition.type, definition);
  }
}

export const blockRegistry = new BlockRegistry(coreBlockDefinitions);
