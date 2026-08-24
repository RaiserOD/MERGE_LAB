import type { DialogueDefinition } from "@domain/dialogues/DialogueDefinition";

export const introDialogue: DialogueDefinition = {
  id: "dialogue.intro",
  oneShot: true,
  lines: [
    { speaker: "narrator", text: "The lift shudders to a stop." },
    { speaker: "professor", text: "You came. Good." },
    { speaker: "professor", text: "Drag two identical samples together." },
  ],
};

export const repeatableDialogue: DialogueDefinition = {
  id: "dialogue.repeatable",
  oneShot: false,
  lines: [{ speaker: "assistant", text: "Anything else?" }],
};

export const testDialogues: DialogueDefinition[] = [introDialogue, repeatableDialogue];
