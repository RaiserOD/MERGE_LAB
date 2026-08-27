import { describe, expect, it } from "vitest";
import { SaveSystem, type KeyValueStorage } from "@infrastructure/persistence/SaveSystem";
import { SaveDataV1Schema } from "@domain/save/SaveDataV1";
import { runtimeConfig } from "@config/runtime";
import { InMemoryStorage } from "../fixtures/InMemoryStorage";
import { FixedClock } from "../fixtures/FixedClock";

function validSave(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    player: { level: 1, xp: 0 },
    board: { cols: runtimeConfig.boardCols, rows: runtimeConfig.boardRows, cells: [] },
    currencies: { coins: 7, gems: 0, researchPoints: 0, energy: 100, maxEnergy: 100 },
    generators: [],
    progression: { labStage: 1, unlockedChapterIds: [] },
    quests: [],
    events: [],
    lastSavedAt: 0,
    ...overrides,
  };
}

describe("SaveSystem — board dimensions are not player-controlled", () => {
  it("loads a save whose board matches the configured grid", () => {
    const storage = new InMemoryStorage();
    storage.setItem("mergeLab.save", JSON.stringify(validSave()));

    const state = new SaveSystem(storage, new FixedClock(0)).load();

    expect(state.board.cols).toBe(runtimeConfig.boardCols);
    expect(state.board.rows).toBe(runtimeConfig.boardRows);
    expect(state.currencies.coins).toBe(7);
  });

  it("rejects a save claiming a different grid, falling back to a fresh game", () => {
    const storage = new InMemoryStorage();
    storage.setItem(
      "mergeLab.save",
      JSON.stringify(validSave({ board: { cols: 40, rows: 40, cells: [] } })),
    );

    const state = new SaveSystem(storage, new FixedClock(0)).load();

    // Canon §39 fixes the board at 7x9; a save saying otherwise is discarded,
    // not believed, so the tampered coin balance does not survive either.
    expect(state.board.cols).toBe(runtimeConfig.boardCols);
    expect(state.board.rows).toBe(runtimeConfig.boardRows);
    expect(state.currencies.coins).toBe(0);
  });

  it("caps board dimensions in the schema, before a grid is ever constructed", () => {
    const result = SaveDataV1Schema.safeParse(
      validSave({ board: { cols: 100000, rows: 100000, cells: [] } }),
    );

    expect(result.success).toBe(false);
  });

  it("falls back to the backup slot when the primary save is tampered with", () => {
    const storage = new InMemoryStorage();
    storage.setItem(
      "mergeLab.save",
      JSON.stringify(validSave({ board: { cols: 9, rows: 9, cells: [] } })),
    );
    storage.setItem("mergeLab.save.backup", JSON.stringify(validSave({ lastSavedAt: 5 })));

    const state = new SaveSystem(storage, new FixedClock(0)).load();

    expect(state.board.cols).toBe(runtimeConfig.boardCols);
    expect(state.currencies.coins).toBe(7);
  });
});

describe("SaveSystem.save propagates storage failures to its caller", () => {
  it("throws when the underlying storage refuses the write", () => {
    const failing: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    const system = new SaveSystem(failing, new FixedClock(0));

    expect(() => {
      system.save(new SaveSystem(new InMemoryStorage(), new FixedClock(0)).load());
    }).toThrow();
  });
});
