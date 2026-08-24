import type { TutorialStepDefinition } from "@domain/tutorial/TutorialStepDefinition";

export const testTutorialSteps: TutorialStepDefinition[] = [
  {
    id: "tutorial.first_merge",
    instruction: "Drag one sample onto the other.",
    completedBy: { event: "ITEM_MERGED" },
  },
  {
    id: "tutorial.use_generator",
    instruction: "Tap the Water Tap.",
    dialogueId: "dialogue.intro",
    completedBy: { event: "GENERATOR_USED", generatorId: "gen.water_tap" },
  },
  {
    id: "tutorial.first_order",
    instruction: "Deliver the order.",
    completedBy: { event: "ORDER_COMPLETED" },
  },
];
