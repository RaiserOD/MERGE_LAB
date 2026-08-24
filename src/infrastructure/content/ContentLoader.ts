import { ItemDefinitionSchema, type ItemDefinition } from "@domain/items/ItemDefinition";
import { ItemRegistry } from "@domain/items/ItemRegistry";

/**
 * Bridges the content/ JSON pipeline into runtime domain objects. This is
 * the only place gameplay code touches Vite's module loading — everything
 * downstream consumes a plain ItemRegistry.
 */
const itemModules = import.meta.glob<{ default: unknown }>("/content/items/*.json", {
  eager: true,
});

export function loadItemDefinitions(): ItemDefinition[] {
  const items: ItemDefinition[] = [];

  for (const [path, mod] of Object.entries(itemModules)) {
    const parsed = ItemDefinitionSchema.safeParse(mod.default);
    if (!parsed.success) {
      throw new Error(`${path} failed schema validation: ${parsed.error.message}`);
    }
    items.push(parsed.data);
  }

  return items;
}

export function loadItemRegistry(): ItemRegistry {
  return new ItemRegistry(loadItemDefinitions());
}
