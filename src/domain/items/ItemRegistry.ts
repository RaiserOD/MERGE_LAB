import type { ItemDefinition } from "@domain/items/ItemDefinition";

/**
 * In-memory lookup over validated ItemDefinitions (unique IDs, resolvable
 * resultItemId references). Construction throws on a broken content set —
 * content-validator catches this at build time, but the registry re-checks
 * at runtime so a corrupted/mismatched content bundle fails loudly instead
 * of silently breaking merges.
 */
export class ItemRegistry {
  private readonly byId: Map<string, ItemDefinition>;

  constructor(definitions: readonly ItemDefinition[]) {
    this.byId = new Map();

    for (const definition of definitions) {
      if (this.byId.has(definition.id)) {
        throw new Error(`Duplicate item id in content: ${definition.id}`);
      }
      this.byId.set(definition.id, definition);
    }

    for (const definition of definitions) {
      if (definition.resultItemId && !this.byId.has(definition.resultItemId)) {
        throw new Error(
          `${definition.id}: resultItemId "${definition.resultItemId}" does not exist`,
        );
      }
    }
  }

  getById(id: string): ItemDefinition | undefined {
    return this.byId.get(id);
  }

  requireById(id: string): ItemDefinition {
    const item = this.byId.get(id);
    if (!item) {
      throw new Error(`Unknown item id: ${id}`);
    }
    return item;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): readonly ItemDefinition[] {
    return [...this.byId.values()];
  }

  /** The item this one merges into, or undefined if it's already max level. */
  getMergeResult(itemId: string): ItemDefinition | undefined {
    const item = this.requireById(itemId);
    return item.resultItemId ? this.byId.get(item.resultItemId) : undefined;
  }
}
