import type { ChapterDefinition } from "@domain/progression/ChapterDefinition";
import type { LabStageDefinition } from "@domain/progression/LabStageDefinition";

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
