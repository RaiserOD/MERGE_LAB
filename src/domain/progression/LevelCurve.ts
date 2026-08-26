/**
 * XP -> player level. Pure function of total XP so the level can
 * always be recomputed from the save rather than drifting out of sync with
 * it.
 *
 * Curve: level N requires `xpForLevel(N)` total XP, growing quadratically
 * so early levels come fast and later ones pace out. Balance values belong
 * in content eventually — balance belongs in JSON; this stays code-side
 * until there's a balance file to hold it.
 */
const XP_BASE = 50;

export function xpForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Level must be a positive integer, got ${level}`);
  }
  const steps = level - 1;
  return XP_BASE * steps * (steps + 1);
}

export function levelForXp(totalXp: number): number {
  if (totalXp < 0) {
    throw new Error(`Total XP cannot be negative, got ${totalXp}`);
  }

  let level = 1;
  while (totalXp >= xpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

/** XP still needed to reach the next level, or 0 once the curve stops mattering. */
export function xpToNextLevel(totalXp: number): number {
  const nextLevel = levelForXp(totalXp) + 1;
  return Math.max(0, xpForLevel(nextLevel) - totalXp);
}
