#!/usr/bin/env tsx
/**
 * Content validator (B5). Validates every content directory that has a
 * domain schema (items, generators, orders, chapters, lab-stages), then
 * checks the cross-reference rules: unique IDs, resolvable resultItemId
 * chains, generator outputs and order requirements pointing at real items,
 * chapter references to real generators/lab stages, no circular chapter
 * unlocks, and an unbroken 1..N lab stage run. Extend this as quest
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
import {
  OrderDefinitionSchema,
  type OrderDefinition,
} from "../../src/domain/orders/OrderDefinition";
import {
  ChapterDefinitionSchema,
  type ChapterDefinition,
} from "../../src/domain/progression/ChapterDefinition";
import {
  LabStageDefinitionSchema,
  type LabStageDefinition,
} from "../../src/domain/progression/LabStageDefinition";

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

interface ContentSet {
  items: ItemDefinition[];
  generators: GeneratorDefinition[];
  orders: OrderDefinition[];
  chapters: ChapterDefinition[];
  labStages: LabStageDefinition[];
}

function validateCrossReferences({
  items,
  generators,
  orders,
  chapters,
  labStages,
}: ContentSet): string[] {
  const errors: string[] = [];
  const itemIds = new Set<string>();
  const generatorIds = new Set<string>();
  const orderIds = new Set<string>();
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  const labStageNumbers = new Set(labStages.map((stage) => stage.stage));

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

  for (const order of orders) {
    if (orderIds.has(order.id)) {
      errors.push(`Duplicate order id: ${order.id}`);
    }
    orderIds.add(order.id);

    for (const requirement of order.requirements) {
      if (!itemIds.has(requirement.itemId)) {
        errors.push(`${order.id}: required itemId "${requirement.itemId}" does not exist`);
      }
    }

    if (!chapterIds.has(order.chapterId)) {
      errors.push(`${order.id}: chapterId "${order.chapterId}" does not exist`);
    }
  }

  errors.push(...validateChapters(chapters, chapterIds, generatorIds, labStageNumbers));
  errors.push(...validateLabStages(labStages));

  return errors;
}

function validateChapters(
  chapters: ChapterDefinition[],
  chapterIds: Set<string>,
  generatorIds: Set<string>,
  labStageNumbers: Set<number>,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  /** chapterId -> chapters it depends on, built from "chapterUnlocked:<id>" conditions. */
  const dependencies = new Map<string, string[]>();

  for (const chapter of chapters) {
    if (seen.has(chapter.id)) {
      errors.push(`Duplicate chapter id: ${chapter.id}`);
    }
    seen.add(chapter.id);

    if (!labStageNumbers.has(chapter.labStage)) {
      errors.push(`${chapter.id}: labStage ${chapter.labStage} has no definition`);
    }

    for (const generatorId of chapter.availableGenerators) {
      if (!generatorIds.has(generatorId)) {
        errors.push(`${chapter.id}: availableGenerator "${generatorId}" does not exist`);
      }
    }

    const chapterDeps: string[] = [];
    for (const condition of chapter.unlockConditions) {
      const chapterRef = /^chapterUnlocked:(.+)$/.exec(condition);
      if (chapterRef?.[1]) {
        if (!chapterIds.has(chapterRef[1])) {
          errors.push(
            `${chapter.id}: unlock condition references unknown chapter "${chapterRef[1]}"`,
          );
        }
        chapterDeps.push(chapterRef[1]);
        continue;
      }
      if (!/^(labStage|playerLevel)>=\d+$/.test(condition)) {
        errors.push(`${chapter.id}: unsupported unlock condition "${condition}"`);
      }
    }
    dependencies.set(chapter.id, chapterDeps);
  }

  errors.push(...findUnlockCycles(dependencies));

  return errors;
}

/** B5: "no circular chapter unlocks" — a cycle would leave those chapters permanently locked. */
function findUnlockCycles(dependencies: Map<string, string[]>): string[] {
  const errors: string[] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();

  const visit = (chapterId: string, path: string[]): void => {
    if (done.has(chapterId)) {
      return;
    }
    if (visiting.has(chapterId)) {
      errors.push(`Circular chapter unlock: ${[...path, chapterId].join(" -> ")}`);
      return;
    }

    visiting.add(chapterId);
    for (const dependency of dependencies.get(chapterId) ?? []) {
      visit(dependency, [...path, chapterId]);
    }
    visiting.delete(chapterId);
    done.add(chapterId);
  };

  for (const chapterId of dependencies.keys()) {
    visit(chapterId, []);
  }

  return errors;
}

function validateLabStages(labStages: LabStageDefinition[]): string[] {
  const errors: string[] = [];
  const seen = new Set<number>();

  for (const stage of labStages) {
    if (seen.has(stage.stage)) {
      errors.push(`Duplicate lab stage: ${stage.stage}`);
    }
    seen.add(stage.stage);
  }

  // Stages must form an unbroken 1..N run, or progression could never reach the gap.
  const sorted = [...seen].sort((a, b) => a - b);
  sorted.forEach((stage, index) => {
    if (stage !== index + 1) {
      errors.push(`Lab stages must run 1..N without gaps; found ${stage} at position ${index + 1}`);
    }
  });

  return errors;
}

async function main(): Promise<void> {
  const items = await loadDir("items", ItemDefinitionSchema);
  const generators = await loadDir("generators", GeneratorDefinitionSchema);
  const orders = await loadDir("orders", OrderDefinitionSchema);
  const chapters = await loadDir("chapters", ChapterDefinitionSchema);
  const labStages = (await loadDir("lab-stages", LabStageDefinitionSchema.array())).flat();
  const errors = validateCrossReferences({ items, generators, orders, chapters, labStages });

  if (errors.length > 0) {
    console.error(`Content validation failed (${errors.length} error(s)):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Content validation passed: ${items.length} item(s), ${generators.length} generator(s), ` +
      `${orders.length} order(s), ${chapters.length} chapter(s), ${labStages.length} lab stage(s) OK.`,
  );
}

await main();
