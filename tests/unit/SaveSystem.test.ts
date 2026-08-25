import { describe, expect, it } from "vitest";
import { GameState } from "@domain/GameState";
import { SaveSystem } from "@infrastructure/persistence/SaveSystem";
import { InMemoryStorage } from "../fixtures/InMemoryStorage";
import { FixedClock } from "../fixtures/FixedClock";

describe("SaveSystem", () => {
  it("round-trips a game state through save/load", () => {
    const storage = new InMemoryStorage();
    const clock = new FixedClock(1_000);
    const saveSystem = new SaveSystem(storage, clock);

    const state = GameState.createNew();
    state.board.placeItem(0, 0, "item.water");
    state.currencies.coins = 42;

    saveSystem.save(state);
    const loaded = saveSystem.load();

    expect(loaded.currencies.coins).toBe(42);
    expect(loaded.board.getCell(0, 0)).toMatchObject({ itemId: "item.water" });
  });

  it("returns a fresh game when there is no save yet", () => {
    const saveSystem = new SaveSystem(new InMemoryStorage(), new FixedClock());
    const loaded = saveSystem.load();

    expect(loaded.currencies.coins).toBe(0);
    expect(loaded.board.allCells()).toHaveLength(63);
  });

  it("falls back to the backup when the primary save is corrupted", () => {
    const storage = new InMemoryStorage();
    const clock = new FixedClock(1_000);
    const saveSystem = new SaveSystem(storage, clock);

    const state = GameState.createNew();
    state.currencies.coins = 7;
    saveSystem.save(state); // primary = coins:7

    state.currencies.coins = 8;
    saveSystem.save(state); // backup = coins:7, primary = coins:8

    storage.setItem("mergeLab.save", "{ this is not valid json");

    const loaded = saveSystem.load();
    expect(loaded.currencies.coins).toBe(7);
  });

  it("falls back to a fresh game when both primary and backup are corrupted", () => {
    const storage = new InMemoryStorage();
    storage.setItem("mergeLab.save", "not json");
    storage.setItem("mergeLab.save.backup", "also not json");
    const saveSystem = new SaveSystem(storage, new FixedClock());

    const loaded = saveSystem.load();
    expect(loaded.currencies.coins).toBe(0);
  });

  it("rejects a save with an unknown schema version and falls back to a fresh game", () => {
    const storage = new InMemoryStorage();
    storage.setItem("mergeLab.save", JSON.stringify({ version: 999 }));
    const saveSystem = new SaveSystem(storage, new FixedClock());

    const loaded = saveSystem.load();
    expect(loaded.currencies.coins).toBe(0);
  });

  it("rejects a tampered save with a negative currency balance", () => {
    const storage = new InMemoryStorage();
    const clock = new FixedClock(1_000);
    const saveSystem = new SaveSystem(storage, clock);
    saveSystem.save(GameState.createNew());

    const raw = JSON.parse(storage.getItem("mergeLab.save") ?? "{}") as {
      currencies: { coins: number };
    };
    raw.currencies.coins = -999;
    storage.setItem("mergeLab.save", JSON.stringify(raw));

    const loaded = saveSystem.load();
    expect(loaded.currencies.coins).toBe(0);
  });

  describe("hasExistingSave", () => {
    it("is false before anything has ever been saved", () => {
      const saveSystem = new SaveSystem(new InMemoryStorage(), new FixedClock());
      expect(saveSystem.hasExistingSave()).toBe(false);
    });

    it("is true after the first save", () => {
      const saveSystem = new SaveSystem(new InMemoryStorage(), new FixedClock());
      saveSystem.save(GameState.createNew());
      expect(saveSystem.hasExistingSave()).toBe(true);
    });

    it("stays true even if the primary entry becomes corrupted", () => {
      const storage = new InMemoryStorage();
      const saveSystem = new SaveSystem(storage, new FixedClock());
      saveSystem.save(GameState.createNew());

      storage.setItem("mergeLab.save", "not json");

      expect(saveSystem.hasExistingSave()).toBe(true);
    });
  });
});
