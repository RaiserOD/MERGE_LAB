import { describe, expect, it } from "vitest";
import { SaveDataV1Schema } from "@domain/save/SaveDataV1";

function makeValidSave() {
  return {
    version: 1,
    player: { level: 1, xp: 0 },
    board: { cols: 7, rows: 9, cells: [] },
    currencies: { coins: 0, gems: 0, researchPoints: 0, energy: 100, maxEnergy: 100 },
    generators: [],
    progression: { labStage: 1, unlockedChapterIds: ["chapter.basement"] },
    quests: [],
    events: [],
    lastSavedAt: Date.now(),
  };
}

describe("SaveDataV1Schema", () => {
  it("accepts a well-formed save", () => {
    expect(SaveDataV1Schema.safeParse(makeValidSave()).success).toBe(true);
  });

  it("rejects a negative currency balance (tampered save)", () => {
    const save = makeValidSave();
    save.currencies.coins = -500;
    expect(SaveDataV1Schema.safeParse(save).success).toBe(false);
  });

  it("rejects an unknown schema version", () => {
    const save = { ...makeValidSave(), version: 2 };
    expect(SaveDataV1Schema.safeParse(save).success).toBe(false);
  });

  it("defaults discoveredItemIds for a save written before the field existed", () => {
    const parsed = SaveDataV1Schema.safeParse(makeValidSave());

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.progression.discoveredItemIds).toEqual([]);
  });
});
