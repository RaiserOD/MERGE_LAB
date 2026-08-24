#!/usr/bin/env tsx
/**
 * Minimal content validator (B5). Validates every content/items/*.json file
 * against ItemDefinitionSchema, then checks the two cross-reference rules
 * that are meaningful with items alone: unique IDs and resolvable
 * resultItemId chains. Extend this as generators/orders/chapters content is
 * added, per the full B5 checklist in the spec.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ItemDefinitionSchema, type ItemDefinition } from "../../src/domain/items/ItemDefinition";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const itemsDir = path.resolve(__dirname, "../../content/items");

async function loadItems(): Promise<ItemDefinition[]> {
  const files = (await readdir(itemsDir)).filter((f) => f.endsWith(".json"));
  const items: ItemDefinition[] = [];

  for (const file of files) {
    const raw = await readFile(path.join(itemsDir, file), "utf-8");
    const parsed = ItemDefinitionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(`content/items/${file} failed schema validation:\n${parsed.error.message}`);
    }
    items.push(parsed.data);
  }

  return items;
}

function validateCrossReferences(items: ItemDefinition[]): string[] {
  const errors: string[] = [];
  const idsSeen = new Set<string>();
  const idToItem = new Map(items.map((item) => [item.id, item]));

  for (const item of items) {
    if (idsSeen.has(item.id)) {
      errors.push(`Duplicate item id: ${item.id}`);
    }
    idsSeen.add(item.id);

    if (item.resultItemId && !idToItem.has(item.resultItemId)) {
      errors.push(`${item.id}: resultItemId "${item.resultItemId}" does not exist`);
    }
  }

  return errors;
}

async function main(): Promise<void> {
  const items = await loadItems();
  const errors = validateCrossReferences(items);

  if (errors.length > 0) {
    console.error(`Content validation failed (${errors.length} error(s)):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Content validation passed: ${items.length} item definition(s) OK.`);
}

await main();
