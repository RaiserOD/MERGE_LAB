import { z } from "zod";

/**
 * Chapter content container.
 *
 * `unlockConditions` is a list of strings, as specified. ProgressionSystem
 * understands exactly three forms and throws on anything else, so a typo
 * fails loudly instead of silently unlocking content:
 *   - "labStage>=N"
 *   - "playerLevel>=N"
 *   - "chapterUnlocked:<chapterId>"
 *
 * `orderPoolId`/`questPoolId` from the spec are optional here: orders
 * currently carry their own `chapterId`, which is the source of truth for
 * which chapter an order belongs to, and quest pools don't exist yet. They
 * stay in the schema so content can adopt pools without a schema migration.
 */
export const ChapterDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  unlockConditions: z.array(z.string().min(1)),
  availableItemGroups: z.array(z.string().min(1)),
  availableGenerators: z.array(z.string().min(1)),
  orderPoolId: z.string().min(1).optional(),
  questPoolId: z.string().min(1).optional(),
  dialogueIds: z.array(z.string().min(1)),
  labStage: z.number().int().positive(),
});

export type ChapterDefinition = z.infer<typeof ChapterDefinitionSchema>;
