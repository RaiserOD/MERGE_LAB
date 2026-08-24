import { describe, expect, it } from "vitest";
import { DialogueRegistry } from "@domain/dialogues/DialogueRegistry";
import { DialogueDefinitionSchema } from "@domain/dialogues/DialogueDefinition";
import { introDialogue, testDialogues } from "../fixtures/testDialogues";

describe("DialogueRegistry", () => {
  it("looks up dialogues by id", () => {
    const registry = new DialogueRegistry(testDialogues);

    expect(registry.getById("dialogue.intro")).toEqual(introDialogue);
    expect(registry.has("dialogue.unknown")).toBe(false);
  });

  it("throws on duplicate ids", () => {
    expect(() => new DialogueRegistry([introDialogue, introDialogue])).toThrow(
      /Duplicate dialogue id/,
    );
  });

  it("requireById throws for unknown ids", () => {
    const registry = new DialogueRegistry(testDialogues);
    expect(() => registry.requireById("dialogue.unknown")).toThrow(/Unknown dialogue id/);
  });
});

describe("DialogueDefinitionSchema", () => {
  it("defaults oneShot to true", () => {
    const parsed = DialogueDefinitionSchema.safeParse({
      id: "dialogue.x",
      lines: [{ speaker: "professor", text: "Hello." }],
    });

    expect(parsed.success && parsed.data.oneShot).toBe(true);
  });

  it("rejects an unknown speaker", () => {
    const parsed = DialogueDefinitionSchema.safeParse({
      id: "dialogue.x",
      lines: [{ speaker: "villain", text: "Hello." }],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects a dialogue with no lines", () => {
    const parsed = DialogueDefinitionSchema.safeParse({ id: "dialogue.x", lines: [] });

    expect(parsed.success).toBe(false);
  });
});
