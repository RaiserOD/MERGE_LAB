import { z } from "zod";

/**
 * Versioned save schema (see docs/architecture/data-contracts.md and
 * ADR-0001). Every load MUST pass through this schema before the save is
 * applied to game state — localStorage is player-controlled and untrusted
 * input, not just a serialization detail.
 */

const BoardCellStateSchema = z.enum(["EMPTY", "OCCUPIED", "BLOCKED", "LOCKED"]);

const BoardCellSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  state: BoardCellStateSchema,
  itemId: z.string().min(1).optional(),
});

const BoardSaveSchema = z.object({
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
  cells: z.array(BoardCellSchema),
});

const CurrencySaveSchema = z.object({
  coins: z.number().int().nonnegative(),
  gems: z.number().int().nonnegative(),
  researchPoints: z.number().int().nonnegative(),
  energy: z.number().nonnegative(),
  maxEnergy: z.number().positive(),
});

const GeneratorSaveSchema = z.object({
  generatorId: z.string().min(1),
  chargesRemaining: z.number().int().nonnegative(),
  cooldownEndsAt: z.number().int().nonnegative().nullable(),
});

const PlayerSaveSchema = z.object({
  level: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
});

const ProgressionSaveSchema = z.object({
  labStage: z.number().int().nonnegative(),
  unlockedChapterIds: z.array(z.string().min(1)),
});

const QuestSaveSchema = z.object({
  questId: z.string().min(1),
  progress: z.number().int().nonnegative(),
  completed: z.boolean(),
});

const EventSaveSchema = z.object({
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
