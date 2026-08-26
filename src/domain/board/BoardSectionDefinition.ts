import { z } from "zod";

/**
 * A named group of board cells that unlocks together.
 *
 * Canon §39: the board never changes dimensions during the campaign — it is
 * 7×9 = 63 cells throughout, and the coordinate system never changes.
 * Instead cells "become available progressively", and "exact cell IDs and
 * coin costs are content data". This schema is that content.
 *
 * Sections partition the grid: every cell belongs to exactly one section,
 * and the content validator rejects overlaps and gaps. Section 1 is the
 * starter area and is open on a new game; every other section starts
 * LOCKED and is bought with coins once its `unlockConditions` hold.
 */
export const BoardSectionCellSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});

export const BoardSectionDefinitionSchema = z.object({
  id: z.string().min(1),
  /**
   * Unlock order, 1-based and contiguous, like `chapterNumber` (ADR-0010).
   * Section 1 is the starter area by definition — a new board opens exactly
   * its cells, which is what makes the starting state derivable from content
   * without evaluating any condition.
   */
  sectionNumber: z.number().int().positive(),
  title: z.string().min(1),
  cells: z.array(BoardSectionCellSchema).min(1),
  /** Same vocabulary as chapters — see `UnlockCondition.ts`. Empty means "no gate". */
  unlockConditions: z.array(z.string().min(1)),
  /** Coins charged on unlock. Canon §39 makes the cost content data. */
  unlockCost: z.number().int().nonnegative(),
});

export type BoardSectionCell = z.infer<typeof BoardSectionCellSchema>;
export type BoardSectionDefinition = z.infer<typeof BoardSectionDefinitionSchema>;
