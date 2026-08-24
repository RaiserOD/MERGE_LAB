import type { z } from "zod";
import { ItemDefinitionSchema, type ItemDefinition } from "@domain/items/ItemDefinition";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import {
  GeneratorDefinitionSchema,
  type GeneratorDefinition,
} from "@domain/generators/GeneratorDefinition";
import { GeneratorRegistry } from "@domain/generators/GeneratorRegistry";
import { OrderDefinitionSchema, type OrderDefinition } from "@domain/orders/OrderDefinition";
import { OrderRegistry } from "@domain/orders/OrderRegistry";

/**
 * Bridges the content/ JSON pipeline into runtime domain objects. This is
 * the only place gameplay code touches Vite's module loading — everything
 * downstream consumes plain registries.
 */
const itemModules = import.meta.glob<{ default: unknown }>("/content/items/*.json", {
  eager: true,
});

const generatorModules = import.meta.glob<{ default: unknown }>("/content/generators/*.json", {
  eager: true,
});

const orderModules = import.meta.glob<{ default: unknown }>("/content/orders/*.json", {
  eager: true,
});

function parseAll<TOut>(
  modules: Record<string, { default: unknown }>,
  schema: z.ZodType<TOut>,
): TOut[] {
  const parsedAll: TOut[] = [];

  for (const [path, mod] of Object.entries(modules)) {
    const parsed = schema.safeParse(mod.default);
    if (!parsed.success) {
      throw new Error(`${path} failed schema validation: ${parsed.error.message}`);
    }
    parsedAll.push(parsed.data);
  }

  return parsedAll;
}

export function loadItemDefinitions(): ItemDefinition[] {
  return parseAll(itemModules, ItemDefinitionSchema);
}

export function loadGeneratorDefinitions(): GeneratorDefinition[] {
  return parseAll(generatorModules, GeneratorDefinitionSchema);
}

export function loadOrderDefinitions(): OrderDefinition[] {
  return parseAll(orderModules, OrderDefinitionSchema);
}

export function loadItemRegistry(): ItemRegistry {
  return new ItemRegistry(loadItemDefinitions());
}

export function loadGeneratorRegistry(): GeneratorRegistry {
  return new GeneratorRegistry(loadGeneratorDefinitions());
}

export function loadOrderRegistry(): OrderRegistry {
  return new OrderRegistry(loadOrderDefinitions());
}
