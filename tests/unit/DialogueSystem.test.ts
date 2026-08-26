import { beforeEach, describe, expect, it } from "vitest";
import { DialogueRegistry } from "@domain/dialogues/DialogueRegistry";
import type { ProgressionSave } from "@domain/save/SaveDataV1";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { DialogueSystem } from "@systems/DialogueSystem";
import { introDialogue, testDialogues } from "../fixtures/testDialogues";
import { makeProgressionSave } from "../fixtures/testProgression";

describe("DialogueSystem", () => {
  let progression: ProgressionSave;
  let eventBus: EventBus<DomainEvent>;
  let emitted: DomainEvent[];
  let system: DialogueSystem;

  beforeEach(() => {
    progression = makeProgressionSave();
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    for (const type of ["DIALOGUE_STARTED", "DIALOGUE_ADVANCED", "DIALOGUE_COMPLETED"] as const) {
      eventBus.on(type, (event) => emitted.push(event));
    }

    system = new DialogueSystem(progression, new DialogueRegistry(testDialogues), eventBus);
  });

  it("starts on the first line and reports it as active", () => {
    expect(system.start("dialogue.intro")).toBe(true);

    expect(system.isActive()).toBe(true);
    expect(system.getActive()).toMatchObject({
      dialogueId: "dialogue.intro",
      lineIndex: 0,
      isLastLine: false,
    });
    expect(emitted).toEqual([
      { type: "DIALOGUE_STARTED", dialogueId: "dialogue.intro", lineCount: 3 },
    ]);
  });

  it("advances line by line and flags the last one", () => {
    system.start("dialogue.intro");

    system.advance();
    expect(system.getActive()?.lineIndex).toBe(1);

    system.advance();
    expect(system.getActive()).toMatchObject({ lineIndex: 2, isLastLine: true });
  });

  it("completes after the final line and records it as seen", () => {
    system.start("dialogue.intro");
    for (let i = 0; i < introDialogue.lines.length; i++) {
      system.advance();
    }

    expect(system.isActive()).toBe(false);
    expect(system.getActive()).toBeUndefined();
    expect(progression.seenDialogueIds).toEqual(["dialogue.intro"]);
    expect(emitted.at(-1)).toEqual({ type: "DIALOGUE_COMPLETED", dialogueId: "dialogue.intro" });
  });

  it("refuses to replay a one-shot dialogue that has been seen", () => {
    system.start("dialogue.intro");
    system.skip();

    expect(system.canPlay("dialogue.intro")).toBe(false);
    expect(system.start("dialogue.intro")).toBe(false);
    expect(system.isActive()).toBe(false);
  });

  it("replays a dialogue that is not one-shot", () => {
    system.start("dialogue.repeatable");
    system.skip();

    expect(system.canPlay("dialogue.repeatable")).toBe(true);
    expect(system.start("dialogue.repeatable")).toBe(true);
  });

  it("skipping still counts the dialogue as seen", () => {
    system.start("dialogue.intro");
    system.skip();

    expect(progression.seenDialogueIds).toEqual(["dialogue.intro"]);
    expect(emitted.at(-1)).toEqual({ type: "DIALOGUE_COMPLETED", dialogueId: "dialogue.intro" });
  });

  it("refuses to start a second dialogue while one is on screen", () => {
    system.start("dialogue.intro");

    expect(system.start("dialogue.repeatable")).toBe(false);
    expect(system.getActive()?.dialogueId).toBe("dialogue.intro");
  });

  it("treats advance and skip as no-ops when nothing is active", () => {
    system.advance();
    system.skip();

    expect(emitted).toHaveLength(0);
  });

  it("does not re-record a dialogue already marked seen", () => {
    progression.seenDialogueIds.push("dialogue.repeatable");
    system.start("dialogue.repeatable");
    system.skip();

    expect(progression.seenDialogueIds).toEqual(["dialogue.repeatable"]);
  });

  it("throws for an unknown dialogue id", () => {
    expect(() => system.start("dialogue.unknown")).toThrow(/Unknown dialogue id/);
  });
});
