#!/usr/bin/env tsx
/**
 * Content validator. Validates every content directory that has a
 * domain schema (items, generators, orders, chapters, lab-stages, quests,
 * dialogues), then checks the cross-reference rules: unique IDs, resolvable
 * resultItemId chains, generator outputs and order requirements pointing at
 * real items, chapter references to real generators/lab stages/dialogues,
 * quest filters naming real content, no circular chapter unlocks, unique and
 * unbroken 1..N chapter numbering, and an unbroken 1..N lab stage run.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  BoardSectionDefinitionSchema,
  type BoardSectionDefinition,
} from "../../src/domain/board/BoardSectionDefinition";
import {
  isSupportedUnlockCondition,
  referencedChapterId,
} from "../../src/domain/progression/UnlockCondition";
import { runtimeConfig } from "../../src/config/runtime";
import {
  LabStageDefinitionSchema,
  type LabStageDefinition,
} from "../../src/domain/progression/LabStageDefinition";
import {
  QuestDefinitionSchema,
  type QuestDefinition,
} from "../../src/domain/quests/QuestDefinition";
import {
  DialogueDefinitionSchema,
  type DialogueDefinition,
} from "../../src/domain/dialogues/DialogueDefinition";
import {
  TutorialStepDefinitionSchema,
  type TutorialStepDefinition,
} from "../../src/domain/tutorial/TutorialStepDefinition";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../../content");

// Input is left as `unknown` so schemas using .default() (whose input and
// output types differ) still infer TOut from the parsed output.
async function loadDir<TOut>(
  dirName: string,
  schema: z.ZodType<TOut, z.ZodTypeDef, unknown>,
): Promise<TOut[]> {
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
  boardSections: BoardSectionDefinition[];
  generators: GeneratorDefinition[];
  orders: OrderDefinition[];
  chapters: ChapterDefinition[];
  labStages: LabStageDefinition[];
  quests: QuestDefinition[];
  dialogues: DialogueDefinition[];
  tutorialSteps: TutorialStepDefinition[];
}

function validateCrossReferences({
  items,
  boardSections,
  generators,
  orders,
  chapters,
  labStages,
  quests,
  dialogues,
  tutorialSteps,
}: ContentSet): string[] {
  const errors: string[] = [];
  const itemIds = new Set<string>();
  const generatorIds = new Set<string>();
  const orderIds = new Set<string>();
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  const labStageNumbers = new Set(labStages.map((stage) => stage.stage));
  const dialogueIds = new Set(dialogues.map((dialogue) => dialogue.id));

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

  errors.push(
    ...validateChapters(chapters, chapterIds, generatorIds, labStageNumbers, dialogueIds),
    ...validateBoardSections(boardSections, chapterIds),
  );
  errors.push(...validateLabStages(labStages));
  errors.push(...validateQuests(quests, itemIds, generatorIds, orderIds));
  errors.push(...validateDialogues(dialogues));
  errors.push(
    ...validateTutorialSteps(tutorialSteps, itemIds, generatorIds, orderIds, dialogueIds),
  );

  return errors;
}

function validateTutorialSteps(
  steps: TutorialStepDefinition[],
  itemIds: Set<string>,
  generatorIds: Set<string>,
  orderIds: Set<string>,
  dialogueIds: Set<string>,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const step of steps) {
    if (seen.has(step.id)) {
      errors.push(`Duplicate tutorial step id: ${step.id}`);
    }
    seen.add(step.id);

    if (step.dialogueId && !dialogueIds.has(step.dialogueId)) {
      errors.push(`${step.id}: dialogueId "${step.dialogueId}" does not exist`);
    }

    const completion = step.completedBy;
    if (completion.event === "ITEM_MERGED" && completion.resultItemId) {
      if (!itemIds.has(completion.resultItemId)) {
        errors.push(`${step.id}: resultItemId "${completion.resultItemId}" does not exist`);
      }
    }
    if (completion.event === "ITEM_DISCOVERED" && completion.itemId) {
      if (!itemIds.has(completion.itemId)) {
        errors.push(`${step.id}: itemId "${completion.itemId}" does not exist`);
      }
    }
    if (completion.event === "GENERATOR_USED" && completion.generatorId) {
      if (!generatorIds.has(completion.generatorId)) {
        errors.push(`${step.id}: generatorId "${completion.generatorId}" does not exist`);
      }
    }
    if (completion.event === "ORDER_COMPLETED" && completion.orderId) {
      if (!orderIds.has(completion.orderId)) {
        errors.push(`${step.id}: orderId "${completion.orderId}" does not exist`);
      }
    }
  }

  return errors;
}

function validateDialogues(dialogues: DialogueDefinition[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const dialogue of dialogues) {
    if (seen.has(dialogue.id)) {
      errors.push(`Duplicate dialogue id: ${dialogue.id}`);
    }
    seen.add(dialogue.id);
  }

  return errors;
}

export function validateQuests(
  quests: QuestDefinition[],
  itemIds: Set<string>,
  generatorIds: Set<string>,
  orderIds: Set<string>,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const questIds = new Set(quests.map((quest) => quest.id));

  for (const quest of quests) {
    if (seen.has(quest.id)) {
      errors.push(`Duplicate quest id: ${quest.id}`);
    }
    seen.add(quest.id);

    // Filters are optional; when present they must name real content.
    const requirement = quest.requirement;
    if (requirement.type === "DISCOVER_ITEM" && requirement.itemId) {
      if (!itemIds.has(requirement.itemId)) {
        errors.push(`${quest.id}: itemId "${requirement.itemId}" does not exist`);
      }
    }
    if (requirement.type === "USE_GENERATOR" && requirement.generatorId) {
      if (!generatorIds.has(requirement.generatorId)) {
        errors.push(`${quest.id}: generatorId "${requirement.generatorId}" does not exist`);
      }
    }
    if (requirement.type === "COMPLETE_ORDER" && requirement.orderId) {
      if (!orderIds.has(requirement.orderId)) {
        errors.push(`${quest.id}: orderId "${requirement.orderId}" does not exist`);
      }
    }
    if (requirement.type === "COMPLETE_QUEST" && requirement.questId) {
      if (!questIds.has(requirement.questId)) {
        errors.push(`${quest.id}: questId "${requirement.questId}" does not exist`);
      }
      if (requirement.questId === quest.id) {
        errors.push(`${quest.id}: COMPLETE_QUEST cannot require itself`);
      }
    }
  }

  errors.push(...findQuestCycles(quests));

  return errors;
}

/**
 * COMPLETE_QUEST chains must not form a cycle. A -> B -> A is not a crash
 * (QuestSystem marks a quest completed before emitting, so re-entry
 * terminates) but neither quest can ever complete, because each is waiting
 * on the other. Chapters have had this check from the start; quests only checked
 * direct self-reference, which missed every cycle longer than one.
 */
function findQuestCycles(quests: QuestDefinition[]): string[] {
  const dependencies = new Map<string, string[]>();
  for (const quest of quests) {
    const requirement = quest.requirement;
    dependencies.set(
      quest.id,
      requirement.type === "COMPLETE_QUEST" && requirement.questId ? [requirement.questId] : [],
    );
  }

  const errors: string[] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();

  const visit = (questId: string, path: string[]): void => {
    if (done.has(questId)) {
      return;
    }
    if (visiting.has(questId)) {
      errors.push(`Circular quest requirement: ${[...path, questId].join(" -> ")}`);
      return;
    }

    visiting.add(questId);
    for (const dependency of dependencies.get(questId) ?? []) {
      visit(dependency, [...path, questId]);
    }
    visiting.delete(questId);
    done.add(questId);
  };

  for (const questId of dependencies.keys()) {
    visit(questId, []);
  }

  return errors;
}

export function validateChapters(
  chapters: ChapterDefinition[],
  chapterIds: Set<string>,
  generatorIds: Set<string>,
  labStageNumbers: Set<number>,
  dialogueIds: Set<string>,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  /** chapterNumber -> the first chapter that claimed it, so a clash names both sides. */
  const numbering = new Map<number, string>();
  /** chapterId -> chapters it depends on, built from "chapterUnlocked:<id>" conditions. */
  const dependencies = new Map<string, string[]>();

  for (const chapter of chapters) {
    if (seen.has(chapter.id)) {
      errors.push(`Duplicate chapter id: ${chapter.id}`);
    }
    seen.add(chapter.id);

    const claimedBy = numbering.get(chapter.chapterNumber);
    if (claimedBy !== undefined) {
      errors.push(
        `${chapter.id}: chapterNumber ${chapter.chapterNumber} is already used by ${claimedBy}`,
      );
    } else {
      numbering.set(chapter.chapterNumber, chapter.id);
    }

    if (!labStageNumbers.has(chapter.labStage)) {
      errors.push(`${chapter.id}: labStage ${chapter.labStage} has no definition`);
    }

    for (const generatorId of chapter.availableGenerators) {
      if (!generatorIds.has(generatorId)) {
        errors.push(`${chapter.id}: availableGenerator "${generatorId}" does not exist`);
      }
    }

    for (const dialogueId of chapter.dialogueIds) {
      if (!dialogueIds.has(dialogueId)) {
        errors.push(`${chapter.id}: dialogueId "${dialogueId}" does not exist`);
      }
    }

    const chapterDeps: string[] = [];
    for (const condition of chapter.unlockConditions) {
      errors.push(...validateUnlockCondition(chapter.id, condition, chapterIds));
      const chapterRef = referencedChapterId(condition);
      if (chapterRef !== undefined) {
        chapterDeps.push(chapterRef);
      }
    }
    dependencies.set(chapter.id, chapterDeps);
  }

  errors.push(...findNumberingGaps(numbering));
  errors.push(...findUnlockCycles(dependencies));

  return errors;
}

/**
 * Chapter numbers must run 1..N with no gaps. The number is the campaign's
 * running order (ADR-0010), so a gap means either a chapter is missing or
 * someone renumbered half of them — both are content bugs, not layouts we
 * want to support.
 */
function findNumberingGaps(numbering: Map<number, string>): string[] {
  const errors: string[] = [];
  for (let expected = 1; expected <= numbering.size; expected += 1) {
    if (!numbering.has(expected)) {
      errors.push(
        `Chapter numbering has a gap: ${numbering.size} chapter(s) defined, but none has ` +
          `chapterNumber ${expected}`,
      );
    }
  }
  return errors;
}

/** "No circular chapter unlocks" — a cycle would leave those chapters permanently locked. */
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

/**
 * One condition, checked against the shared vocabulary in
 * `UnlockCondition.ts`. The validator used to carry its own copy of those
 * patterns; two copies of a rule is one copy too many.
 */
function validateUnlockCondition(
  ownerId: string,
  condition: string,
  chapterIds: Set<string>,
): string[] {
  if (!isSupportedUnlockCondition(condition)) {
    return [`${ownerId}: unsupported unlock condition "${condition}"`];
  }

  const chapterRef = referencedChapterId(condition);
  if (chapterRef !== undefined && !chapterIds.has(chapterRef)) {
    return [`${ownerId}: unlock condition references unknown chapter "${chapterRef}"`];
  }

  return [];
}

/**
 * Board sections must partition the grid exactly: canon §39 keeps the board
 * at a fixed size and opens it progressively, so every one of the 63 cells
 * belongs to exactly one section. A missing cell would be unreachable
 * forever; an overlapping one would be unlocked by two different purchases.
 */
export function validateBoardSections(
  sections: BoardSectionDefinition[],
  chapterIds: Set<string>,
): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const numbering = new Map<number, string>();
  const owningSection = new Map<string, string>();

  for (const section of sections) {
    if (seenIds.has(section.id)) {
      errors.push(`Duplicate board section id: ${section.id}`);
    }
    seenIds.add(section.id);

    const claimedBy = numbering.get(section.sectionNumber);
    if (claimedBy !== undefined) {
      errors.push(
        `${section.id}: sectionNumber ${section.sectionNumber} is already used by ${claimedBy}`,
      );
    } else {
      numbering.set(section.sectionNumber, section.id);
    }

    for (const cell of section.cells) {
      if (cell.x >= runtimeConfig.boardCols || cell.y >= runtimeConfig.boardRows) {
        errors.push(
          `${section.id}: cell (${cell.x},${cell.y}) is outside the ` +
            `${runtimeConfig.boardCols}x${runtimeConfig.boardRows} board`,
        );
        continue;
      }

      const key = `${cell.x},${cell.y}`;
      const owner = owningSection.get(key);
      if (owner !== undefined) {
        errors.push(
          `Board cell (${cell.x},${cell.y}) is claimed by both ${owner} and ${section.id}`,
        );
      } else {
        owningSection.set(key, section.id);
      }
    }

    for (const condition of section.unlockConditions) {
      errors.push(...validateUnlockCondition(section.id, condition, chapterIds));
    }
  }

  errors.push(...findSectionNumberingGaps(numbering));

  if (sections.length > 0) {
    for (let y = 0; y < runtimeConfig.boardRows; y += 1) {
      for (let x = 0; x < runtimeConfig.boardCols; x += 1) {
        if (!owningSection.has(`${x},${y}`)) {
          errors.push(`Board cell (${x},${y}) belongs to no section`);
        }
      }
    }

    const starter = sections.find((section) => section.sectionNumber === 1);
    if (starter && starter.unlockConditions.length > 0) {
      errors.push(
        `${starter.id}: the starter section (sectionNumber 1) opens on a new game, ` +
          `so it cannot carry unlock conditions`,
      );
    }
    if (starter && starter.unlockCost > 0) {
      errors.push(
        `${starter.id}: the starter section (sectionNumber 1) opens on a new game, ` +
          `so its unlockCost must be 0`,
      );
    }
  }

  return errors;
}

/** Section numbers run 1..N without gaps, for the same reason chapter numbers do. */
function findSectionNumberingGaps(numbering: Map<number, string>): string[] {
  const errors: string[] = [];
  for (let expected = 1; expected <= numbering.size; expected += 1) {
    if (!numbering.has(expected)) {
      errors.push(
        `Board section numbering has a gap: ${numbering.size} section(s) defined, but none ` +
          `has sectionNumber ${expected}`,
      );
    }
  }
  return errors;
}

async function main(): Promise<void> {
  const items = await loadDir("items", ItemDefinitionSchema);
  const generators = await loadDir("generators", GeneratorDefinitionSchema);
  const orders = await loadDir("orders", OrderDefinitionSchema);
  const chapters = await loadDir("chapters", ChapterDefinitionSchema);
  const boardSections = await loadDir("board-sections", BoardSectionDefinitionSchema);
  const labStages = (await loadDir("lab-stages", LabStageDefinitionSchema.array())).flat();
  const quests = await loadDir("quests", QuestDefinitionSchema);
  const dialogues = await loadDir("dialogues", DialogueDefinitionSchema);
  const tutorialSteps = (await loadDir("tutorial", TutorialStepDefinitionSchema.array())).flat();
  const errors = validateCrossReferences({
    items,
    boardSections,
    generators,
    orders,
    chapters,
    labStages,
    quests,
    dialogues,
    tutorialSteps,
  });

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
      `${orders.length} order(s), ${chapters.length} chapter(s), ` +
      `${boardSections.length} board section(s), ${labStages.length} lab stage(s), ` +
      `${quests.length} quest(s), ${dialogues.length} dialogue(s), ` +
      `${tutorialSteps.length} tutorial step(s) OK.`,
  );
}

/**
 * Run only when invoked as a script. The rule functions above are imported
 * by unit tests, and a top-level `await main()` would make every such import
 * re-validate the whole content tree as a side effect.
 */
const entryPoint = process.argv[1];
if (entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href) {
  await main();
}
