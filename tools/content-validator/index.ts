#!/usr/bin/env tsx
/**
 * Content validator (B5). Validates content/items/*.json and
 * content/generators/*.json against their domain schemas, then checks the
 * cross-reference rules that are meaningful for the content types that
 * exist so far: unique IDs, resolvable resultItemId chains, and generator
 * outputs pointing at real items. Extend this as orders/chapters/quests
 * content is added, per the full B5 checklist in the spec.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { ItemDefinitionSchema, type ItemDefinition } from "../../src/domain/items/ItemDefinition";
import {
  GeneratorDefinitionSchema,
  type GeneratorDefinition,
} from "../../src/domain/generators/GeneratorDefinition";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../../content");

async function loadDir<TOut>(dirName: string, schema: z.ZodType<TOut>): Promise<TOut[]> {
  const dir = path.join(contentDir, dirName);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const parsedAll: TOut[] = [];

  for (const file of files) {
    const raw = await readFile(path.join(dir, file), "utf-8");
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(
        `content/${dirName}/${file} failed schema validation:\n${parsed.error.message}`,
      );
    }
    parsedAll.push(parsed.data);
  }

  return parsedAll;
}

function validateCrossReferences(
  items: ItemDefinition[],
  generators: GeneratorDefinition[],
): string[] {
  const errors: string[] = [];
  const itemIds = new Set<string>();
  const generatorIds = new Set<string>();

  for (const item of items) {
    if (itemIds.has(item.id)) {
      errors.push(`Duplicate item id: ${item.id}`);
    }
    itemIds.add(item.id);
  }

  for (const generator of generators) {
    if (generatorIds.has(generator.id)) {
      errors.push(`Duplicate generator id: ${generator.id}`);
    }
    generatorIds.add(generator.id);
  }

  for (const item of items) {
    if (item.resultItemId && !itemIds.has(item.resultItemId)) {
      errors.push(`${item.id}: resultItemId "${item.resultItemId}" does not exist`);
    }
    for (const generatorId of item.sourceGeneratorIds) {
      if (!generatorIds.has(generatorId)) {
        errors.push(`${item.id}: sourceGeneratorId "${generatorId}" does not exist`);
      }
    }
  }

  for (const generator of generators) {
    if (!itemIds.has(generator.outputItemId)) {
      errors.push(`${generator.id}: outputItemId "${generator.outputItemId}" does not exist`);
    }
    if (generator.chargesPerCycle > generator.maxCharges) {
      errors.push(
        `${generator.id}: chargesPerCycle (${generator.chargesPerCycle}) exceeds maxCharges (${generator.maxCharges})`,
      );
    }
  }

  return errors;
}

async function main(): Promise<void> {
  const items = await loadDir("items", ItemDefinitionSchema);
  const generators = await loadDir("generators", GeneratorDefinitionSchema);
  const errors = validateCrossReferences(items, generators);

  if (errors.length > 0) {
    console.error(`Content validation failed (${errors.length} error(s)):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Content validation passed: ${items.length} item(s), ${generators.length} generator(s) OK.`,
  );
}

await main();
