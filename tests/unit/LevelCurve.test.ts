import { describe, expect, it } from "vitest";
import { levelForXp, xpForLevel, xpToNextLevel } from "@domain/progression/LevelCurve";

describe("LevelCurve", () => {
  it("starts level 1 at zero XP", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelForXp(0)).toBe(1);
  });

  it("increases the XP requirement with each level", () => {
    const thresholds = [1, 2, 3, 4, 5].map(xpForLevel);
    const gaps = thresholds.slice(1).map((value, index) => value - (thresholds[index] ?? 0));

    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
  });

  it("maps XP back to the level it unlocks", () => {
    const level3Xp = xpForLevel(3);

    expect(levelForXp(level3Xp - 1)).toBe(2);
    expect(levelForXp(level3Xp)).toBe(3);
    expect(levelForXp(level3Xp + 1)).toBe(3);
  });

  it("reports XP remaining to the next level", () => {
    expect(xpToNextLevel(0)).toBe(xpForLevel(2));
    expect(xpToNextLevel(xpForLevel(2))).toBe(xpForLevel(3) - xpForLevel(2));
  });

  it("rejects invalid input", () => {
    expect(() => xpForLevel(0)).toThrow(/positive integer/);
    expect(() => levelForXp(-1)).toThrow(/cannot be negative/);
  });
});
