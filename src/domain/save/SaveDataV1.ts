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

/**
 * Defence in depth against a hand-edited save. The board's real dimensions
 * come from `runtimeConfig` and are cross-checked on load
 * (`SaveSystem.load`); this bound only stops a save claiming a grid so large
 * that merely constructing it hangs the tab before that check can run.
 * Canon §39 fixes the board at 7x9, so anything near this ceiling is
 * already nonsense.
 */
const MAX_BOARD_DIMENSION = 64;

export const BoardSaveSchema = z.object({
  cols: z.number().int().positive().max(MAX_BOARD_DIMENSION),
  rows: z.number().int().positive().max(MAX_BOARD_DIMENSION),
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
  /**
   * Tutorial steps already finished, stored by id rather than by index so
   * inserting or reordering steps in content doesn't strand a save
   * mid-tutorial. Defaults to empty like the fields above.
   */
  completedTutorialStepIds: z.array(z.string().min(1)).default([]),
  /**
   * Campaign levels whose completion reward has been granted. Canon §32
   * requires level rewards to be granted exactly once, and this is what
   * makes that decidable after a reload.
   *
   * Written ahead of the system that fills it — see ADR-0006. While v1 is
   * unreleased a defaulted field is free; once it ships the same field
   * costs a version bump and a migration.
   */
  completedLevelIds: z.array(z.string().min(1)).default([]),
  /**
   * Content ids unlocked by level completion (canon §33). The unlock list
   * is data on the level definition; this records what has been applied,
   * so unlocking stays idempotent across reloads.
   */
  unlockedContentIds: z.array(z.string().min(1)).default([]),
  /**
   * Research nodes the player has bought (canon §32, §42). Research points
   * are already a currency; this is the record of what they were spent on.
   */
  purchasedResearchNodeIds: z.array(z.string().min(1)).default([]),
});

export const QuestSaveSchema = z.object({
  questId: z.string().min(1),
  progress: z.number().int().nonnegative(),
  completed: z.boolean(),
});

/**
 * A timed in-game event ("Alien Samples" and the like). Persisted and
 * round-tripped, but no system reads or writes it — temporary events are an
 * undecided mechanic (`CURRENT_STATE.md`). The slot stays because removing a
 * persisted field is a save-schema change; there is deliberately no
 * `content/events/` directory, since the content format is part of the
 * decision nobody has made.
 */
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
