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
import {
  BoardSectionDefinitionSchema,
  type BoardSectionDefinition,
} from "@domain/board/BoardSectionDefinition";
import { BoardSectionRegistry } from "@domain/board/BoardSectionRegistry";
import {
  ChapterDefinitionSchema,
  type ChapterDefinition,
} from "@domain/progression/ChapterDefinition";
import {
  LabStageDefinitionSchema,
  type LabStageDefinition,
} from "@domain/progression/LabStageDefinition";
import { ChapterRegistry, LabStageRegistry } from "@domain/progression/ChapterRegistry";
import { QuestDefinitionSchema, type QuestDefinition } from "@domain/quests/QuestDefinition";
import { QuestRegistry } from "@domain/quests/QuestRegistry";
import {
  DialogueDefinitionSchema,
  type DialogueDefinition,
} from "@domain/dialogues/DialogueDefinition";
import { DialogueRegistry } from "@domain/dialogues/DialogueRegistry";
import {
  TutorialStepDefinitionSchema,
  type TutorialStepDefinition,
} from "@domain/tutorial/TutorialStepDefinition";
import { TutorialRegistry } from "@domain/tutorial/TutorialRegistry";

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

const chapterModules = import.meta.glob<{ default: unknown }>("/content/chapters/*.json", {
  eager: true,
});

const boardSectionModules = import.meta.glob<{ default: unknown }>(
  "/content/board-sections/*.json",
  { eager: true },
);

// Lab stages are a single ordered list rather than one file per stage.
const labStageModules = import.meta.glob<{ default: unknown }>("/content/lab-stages/*.json", {
  eager: true,
});

const questModules = import.meta.glob<{ default: unknown }>("/content/quests/*.json", {
  eager: true,
});

const dialogueModules = import.meta.glob<{ default: unknown }>("/content/dialogues/*.json", {
  eager: true,
});

// Tutorial steps are one ordered list, like lab stages.
const tutorialModules = import.meta.glob<{ default: unknown }>("/content/tutorial/*.json", {
  eager: true,
});

// Input is left as `unknown` so schemas using .default() (whose input and
// output types differ) still infer TOut from the parsed output.
function parseAll<TOut>(
  modules: Record<string, { default: unknown }>,
  schema: z.ZodType<TOut, z.ZodTypeDef, unknown>,
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

export function loadChapterDefinitions(): ChapterDefinition[] {
  return parseAll(chapterModules, ChapterDefinitionSchema);
}

export function loadBoardSectionDefinitions(): BoardSectionDefinition[] {
  return parseAll(boardSectionModules, BoardSectionDefinitionSchema);
}

export function loadLabStageDefinitions(): LabStageDefinition[] {
  return parseAll(labStageModules, LabStageDefinitionSchema.array()).flat();
}

export function loadQuestDefinitions(): QuestDefinition[] {
  return parseAll(questModules, QuestDefinitionSchema);
}

export function loadDialogueDefinitions(): DialogueDefinition[] {
  return parseAll(dialogueModules, DialogueDefinitionSchema);
}

export function loadTutorialSteps(): TutorialStepDefinition[] {
  return parseAll(tutorialModules, TutorialStepDefinitionSchema.array()).flat();
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

export function loadChapterRegistry(): ChapterRegistry {
  return new ChapterRegistry(loadChapterDefinitions());
}

export function loadBoardSectionRegistry(): BoardSectionRegistry {
  return new BoardSectionRegistry(loadBoardSectionDefinitions());
}

export function loadLabStageRegistry(): LabStageRegistry {
  return new LabStageRegistry(loadLabStageDefinitions());
}

export function loadQuestRegistry(): QuestRegistry {
  return new QuestRegistry(loadQuestDefinitions());
}

export function loadDialogueRegistry(): DialogueRegistry {
  return new DialogueRegistry(loadDialogueDefinitions());
}

export function loadTutorialRegistry(): TutorialRegistry {
  return new TutorialRegistry(loadTutorialSteps());
}
