import { beforeEach, describe, expect, it } from "vitest";
import type { ProgressionSave } from "@domain/save/SaveDataV1";
import { TutorialRegistry } from "@domain/tutorial/TutorialRegistry";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { TutorialSystem } from "@systems/TutorialSystem";
import { testTutorialSteps } from "../fixtures/testTutorial";

const somePosition = { x: 0, y: 0 };

function makeProgression(completedTutorialStepIds: string[] = []): ProgressionSave {
  return {
    labStage: 1,
    unlockedChapterIds: ["chapter.basement"],
    discoveredItemIds: [],
    seenDialogueIds: [],
    completedTutorialStepIds,
  };
}

describe("TutorialSystem", () => {
  let progression: ProgressionSave;
  let eventBus: EventBus<DomainEvent>;
  let emitted: DomainEvent[];
  let system: TutorialSystem;
  let stop: () => void;

  beforeEach(() => {
    progression = makeProgression();
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    for (const type of ["TUTORIAL_STEP_COMPLETED", "TUTORIAL_COMPLETED"] as const) {
      eventBus.on(type, (event) => emitted.push(event));
    }

    system = new TutorialSystem(progression, new TutorialRegistry(testTutorialSteps), eventBus);
    stop = system.start();
  });

  function emitMerge(): void {
    eventBus.emit({
      type: "ITEM_MERGED",
      consumedItemId: "item.water",
      resultItemId: "item.steam",
      from: somePosition,
      to: { x: 1, y: 0 },
    });
  }

  function emitGeneratorUsed(generatorId = "gen.water_tap"): void {
    eventBus.emit({
      type: "GENERATOR_USED",
      generatorId,
      outputItemId: "item.water",
      position: somePosition,
      chargesRemaining: 1,
    });
  }

  function emitOrderCompleted(): void {
    eventBus.emit({
      type: "ORDER_COMPLETED",
      orderId: "order.first_sample",
      coinReward: 25,
      researchReward: 1,
      xpReward: 5,
    });
  }

  it("starts on the first step", () => {
    expect(system.getCurrentStep()?.id).toBe("tutorial.first_merge");
    expect(system.isCompleted()).toBe(false);
  });

  it("advances when the current step's event fires", () => {
    emitMerge();

    expect(progression.completedTutorialStepIds).toEqual(["tutorial.first_merge"]);
    expect(system.getCurrentStep()?.id).toBe("tutorial.use_generator");
    expect(emitted).toEqual([
      {
        type: "TUTORIAL_STEP_COMPLETED",
        stepId: "tutorial.first_merge",
        nextStepId: "tutorial.use_generator",
      },
    ]);
  });

  it("ignores an event that matches a later step, so steps cannot be skipped", () => {
    emitOrderCompleted();

    expect(progression.completedTutorialStepIds).toEqual([]);
    expect(system.getCurrentStep()?.id).toBe("tutorial.first_merge");
  });

  it("respects a step's filter", () => {
    emitMerge();
    emitGeneratorUsed("gen.other");

    expect(system.getCurrentStep()?.id).toBe("tutorial.use_generator");

    emitGeneratorUsed("gen.water_tap");
    expect(system.getCurrentStep()?.id).toBe("tutorial.first_order");
  });

  it("does not re-complete a step when its event fires again", () => {
    emitMerge();
    emitMerge();

    expect(progression.completedTutorialStepIds).toEqual(["tutorial.first_merge"]);
  });

  it("emits TUTORIAL_COMPLETED after the final step", () => {
    emitMerge();
    emitGeneratorUsed();
    emitOrderCompleted();

    expect(system.isCompleted()).toBe(true);
    expect(system.getCurrentStep()).toBeUndefined();
    expect(emitted.at(-1)).toEqual({ type: "TUTORIAL_COMPLETED" });
  });

  it("resumes from a partially completed save", () => {
    stop();
    const resumed = new TutorialSystem(
      makeProgression(["tutorial.first_merge"]),
      new TutorialRegistry(testTutorialSteps),
      eventBus,
    );

    expect(resumed.getCurrentStep()?.id).toBe("tutorial.use_generator");
  });

  it("reports completion for a save that finished every step", () => {
    stop();
    const finished = new TutorialSystem(
      makeProgression(testTutorialSteps.map((step) => step.id)),
      new TutorialRegistry(testTutorialSteps),
      eventBus,
    );

    expect(finished.isCompleted()).toBe(true);
  });

  it("stops advancing once unsubscribed", () => {
    stop();
    emitMerge();

    expect(progression.completedTutorialStepIds).toEqual([]);
  });

  it("treats an empty tutorial as already complete", () => {
    const empty = new TutorialSystem(makeProgression(), new TutorialRegistry([]), eventBus);

    expect(empty.isCompleted()).toBe(true);
  });
});
