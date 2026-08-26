/**
 * The unlock-condition vocabulary shared by chapters and board sections.
 *
 * Conditions are strings rather than a discriminated union because they are
 * authored by hand in content and read far more often than they are
 * constructed. The three supported forms are:
 *
 *   - "labStage>=N"
 *   - "playerLevel>=N"
 *   - "chapterUnlocked:<chapterId>"
 *
 * Anything else throws. A condition that silently evaluated false would
 * lock content forever with no error to trace, which is strictly worse than
 * failing at the first evaluation.
 *
 * This lives in the domain because three callers need the same answer:
 * ProgressionSystem (chapters), BoardExpansionSystem (sections), and the
 * content validator, which used to carry its own copy of these patterns.
 */

const THRESHOLD_PATTERN = /^(labStage|playerLevel)>=(\d+)$/;
const CHAPTER_PATTERN = /^chapterUnlocked:(.+)$/;

export class UnlockConditionError extends Error {}

/** What a condition is evaluated against. Deliberately narrow — no GameState. */
export interface UnlockContext {
  readonly labStage: number;
  readonly playerLevel: number;
  isChapterUnlocked(chapterId: string): boolean;
}

/** True when `condition` is one of the supported forms. Used by the validator. */
export function isSupportedUnlockCondition(condition: string): boolean {
  return THRESHOLD_PATTERN.test(condition) || CHAPTER_PATTERN.test(condition);
}

/** The chapter id a "chapterUnlocked:<id>" condition names, or undefined for other forms. */
export function referencedChapterId(condition: string): string | undefined {
  return CHAPTER_PATTERN.exec(condition)?.[1];
}

export function evaluateUnlockCondition(condition: string, context: UnlockContext): boolean {
  const threshold = THRESHOLD_PATTERN.exec(condition);
  if (threshold) {
    const value = Number(threshold[2]);
    return threshold[1] === "labStage" ? context.labStage >= value : context.playerLevel >= value;
  }

  const chapterId = referencedChapterId(condition);
  if (chapterId !== undefined) {
    return context.isChapterUnlocked(chapterId);
  }

  throw new UnlockConditionError(`Unsupported unlock condition: "${condition}"`);
}

/** Every condition must hold. An empty list is satisfied — that is how a starter area is authored. */
export function evaluateUnlockConditions(
  conditions: readonly string[],
  context: UnlockContext,
): boolean {
  return conditions.every((condition) => evaluateUnlockCondition(condition, context));
}
