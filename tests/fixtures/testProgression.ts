import type { ChapterDefinition } from "@domain/progression/ChapterDefinition";
import type { LabStageDefinition } from "@domain/progression/LabStageDefinition";
import type { ProgressionSave } from "@domain/save/SaveDataV1";

export const testLabStages: LabStageDefinition[] = [
  { stage: 1, title: "Basement Lab", upgradeCost: 0 },
  { stage: 2, title: "Chemistry Lab", upgradeCost: 150 },
  { stage: 3, title: "Biology Lab", upgradeCost: 500 },
];

export const basementChapter: ChapterDefinition = {
  id: "chapter.basement",
  title: "The Basement",
  unlockConditions: [],
  availableItemGroups: ["chemistry.water"],
  availableGenerators: ["gen.water_tap"],
  dialogueIds: [],
  labStage: 1,
};

export const chemistryChapter: ChapterDefinition = {
  id: "chapter.chemistry",
  title: "Chemistry",
  unlockConditions: ["chapterUnlocked:chapter.basement", "labStage>=2"],
  availableItemGroups: ["chemistry.water"],
  availableGenerators: ["gen.water_tap"],
  dialogueIds: [],
  labStage: 2,
};

export const levelGatedChapter: ChapterDefinition = {
  id: "chapter.level_gated",
  title: "Level Gated",
  unlockConditions: ["playerLevel>=3"],
  availableItemGroups: [],
  availableGenerators: [],
  dialogueIds: [],
  labStage: 1,
};

export const testChapters: ChapterDefinition[] = [
  basementChapter,
  chemistryChapter,
  levelGatedChapter,
];

/**
 * A fresh ProgressionSave for tests, with every field at its empty value.
 *
 * Tests that only care about one field should override that one and let
 * the rest default: `makeProgressionSave({ labStage: 2 })`. Building the
 * literal inline instead means every new save field breaks every test
 * that does so — which is exactly what happened when the campaign fields
 * landed (ADR-0006).
 */
export function makeProgressionSave(overrides: Partial<ProgressionSave> = {}): ProgressionSave {
  return {
    labStage: 1,
    unlockedChapterIds: ["chapter.basement"],
    discoveredItemIds: [],
    seenDialogueIds: [],
    completedTutorialStepIds: [],
    completedLevelIds: [],
    unlockedContentIds: [],
    purchasedResearchNodeIds: [],
    ...overrides,
  };
}
