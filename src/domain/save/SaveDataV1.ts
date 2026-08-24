import { z } from "zod";

/**
 * Versioned save schema (see docs/architecture/data-contracts.md and
 * ADR-0001). Every load MUST pass through this schema before the save is
 * applied to game state — localStorage is player-controlled and untrusted
 * input, not just a serialization detail.
 */

export const BoardCellStateSchema = z.enum(["EMPTY", "OCCUPIED", "BLOCKED", "LOCKED"]);

export const BoardCellSaveSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  state: BoardCellStateSchema,
  itemId: z.string().min(1).optional(),
});

export const BoardSaveSchema = z.object({
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
  cells: z.array(BoardCellSaveSchema),
});

export const CurrencySaveSchema = z.object({
  coins: z.number().int().nonnegative(),
  gems: z.number().int().nonnegative(),
  researchPoints: z.number().int().nonnegative(),
  energy: z.number().nonnegative(),
  maxEnergy: z.number().positive(),
});

export const GeneratorSaveSchema = z.object({
  generatorId: z.string().min(1),
  chargesRemaining: z.number().int().nonnegative(),
  cooldownEndsAt: z.number().int().nonnegative().nullable(),
});

export const PlayerSaveSchema = z.object({
  level: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
});

export const ProgressionSaveSchema = z.object({
  labStage: z.number().int().nonnegative(),
  unlockedChapterIds: z.array(z.string().min(1)),
  /**
   * Items the player has produced at least once, backing DISCOVER_ITEM
   * quests and the collection meta. Defaults to empty so a save written
   * before this field existed still loads — no version bump needed while
   * v1 is unreleased.
   */
  discoveredItemIds: z.array(z.string().min(1)).default([]),
  /**
   * One-shot dialogues the player has already been shown, so chapter
   * intros and tutorial beats don't replay. Defaults to empty for the same
   * reason as discoveredItemIds.
   */
  seenDialogueIds: z.array(z.string().min(1)).default([]),
});

export const QuestSaveSchema = z.object({
  questId: z.string().min(1),
  progress: z.number().int().nonnegative(),
  completed: z.boolean(),
});

export const EventSaveSchema = z.object({
  eventId: z.string().min(1),
  startsAt: z.number().int().nonnegative(),
  endsAt: z.number().int().nonnegative(),
});

export const SaveDataV1Schema = z.object({
  version: z.literal(1),
  player: PlayerSaveSchema,
  board: BoardSaveSchema,
  currencies: CurrencySaveSchema,
  generators: z.array(GeneratorSaveSchema),
  progression: ProgressionSaveSchema,
  quests: z.array(QuestSaveSchema),
  events: z.array(EventSaveSchema),
  lastSavedAt: z.number().int().nonnegative(),
});

export type SaveDataV1 = z.infer<typeof SaveDataV1Schema>;
export type BoardCellSave = z.infer<typeof BoardCellSaveSchema>;
export type BoardSave = z.infer<typeof BoardSaveSchema>;
export type CurrencySave = z.infer<typeof CurrencySaveSchema>;
export type GeneratorSave = z.infer<typeof GeneratorSaveSchema>;
export type PlayerSave = z.infer<typeof PlayerSaveSchema>;
export type ProgressionSave = z.infer<typeof ProgressionSaveSchema>;
export type QuestSave = z.infer<typeof QuestSaveSchema>;
export type EventSave = z.infer<typeof EventSaveSchema>;
