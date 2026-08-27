import { z } from "zod";

/**
 * Dialogue content: dialogues are content JSON, not code.
 *
 * Speakers are the MVP NPC roster plus `narrator` for lines with
 * no on-screen character. A line carries only text — no branching, since
 * MVP narrative is explicitly linear and branching narrative is a
 * stated non-goal.
 */
export const DialogueSpeakerSchema = z.enum(["professor", "assistant", "customer", "narrator"]);

export const DialogueLineSchema = z.object({
  speaker: DialogueSpeakerSchema,
  text: z.string().min(1),
});

export const DialogueDefinitionSchema = z.object({
  id: z.string().min(1),
  lines: z.array(DialogueLineSchema).min(1),
  /** One-shot dialogues (chapter intros, tutorial beats) never replay once seen. */
  oneShot: z.boolean().default(true),
});

export type DialogueSpeaker = z.infer<typeof DialogueSpeakerSchema>;
export type DialogueLine = z.infer<typeof DialogueLineSchema>;
export type DialogueDefinition = z.infer<typeof DialogueDefinitionSchema>;

export const speakerDisplayNames: Record<DialogueSpeaker, string> = {
  professor: "Professor",
  assistant: "Assistant",
  customer: "Customer",
  narrator: "",
};
