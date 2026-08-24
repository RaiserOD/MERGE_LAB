import { beforeEach, describe, expect, it } from "vitest";
import { Board } from "@domain/board/Board";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import { GeneratorRegistry } from "@domain/generators/GeneratorRegistry";
import type { CurrencySave, GeneratorSave } from "@domain/save/SaveDataV1";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { BoardSystem } from "@systems/BoardSystem";
import { EnergySystem } from "@systems/EnergySystem";
import { GeneratorError, GeneratorSystem } from "@systems/GeneratorSystem";
import { FixedClock } from "../fixtures/FixedClock";
import { testItems } from "../fixtures/testItems";
import { testGenerators } from "../fixtures/testGenerators";

describe("GeneratorSystem", () => {
  let board: Board;
  let currencies: CurrencySave;
  let generatorSaves: GeneratorSave[];
  let clock: FixedClock;
  let eventBus: EventBus<DomainEvent>;
  let emitted: DomainEvent[];
  let generatorSystem: GeneratorSystem;

  beforeEach(() => {
    board = Board.createEmpty(7, 9);
    currencies = { coins: 0, gems: 0, researchPoints: 0, energy: 100, maxEnergy: 100 };
    generatorSaves = [];
    clock = new FixedClock(0);
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    eventBus.on("GENERATOR_USED", (event) => emitted.push(event));

    const boardSystem = new BoardSystem(board, new ItemRegistry(testItems), eventBus);
    const energySystem = new EnergySystem(currencies, clock, 0);
    generatorSystem = new GeneratorSystem(
      generatorSaves,
      new GeneratorRegistry(testGenerators),
      boardSystem,
      energySystem,
      eventBus,
      clock,
    );
  });

  it("spawns the output item, spends energy and consumes a charge", () => {
    const result = generatorSystem.use("gen.water_tap");

    expect(result.outputItemId).toBe("item.water");
    expect(result.chargesRemaining).toBe(2);
    expect(currencies.energy).toBe(98);
    expect(board.getCell(0, 0)).toMatchObject({ itemId: "item.water" });
    expect(emitted).toHaveLength(1);
  });

  it("starts a cooldown once the last charge is spent and blocks further use", () => {
    generatorSystem.use("gen.water_tap");
    generatorSystem.use("gen.water_tap");
    generatorSystem.use("gen.water_tap");

    expect(generatorSystem.isOnCooldown("gen.water_tap")).toBe(true);
    expect(() => generatorSystem.use("gen.water_tap")).toThrow(GeneratorError);
  });

  it("refills charges after the cooldown elapses", () => {
    generatorSystem.use("gen.water_tap");
    generatorSystem.use("gen.water_tap");
    generatorSystem.use("gen.water_tap");

    clock.advance(5_000);

    expect(generatorSystem.isOnCooldown("gen.water_tap")).toBe(false);
    expect(generatorSystem.getState("gen.water_tap").chargesRemaining).toBe(3);
    expect(() => generatorSystem.use("gen.water_tap")).not.toThrow();
  });

  it("leaves charges, energy and board untouched when energy is insufficient", () => {
    currencies.energy = 1;

    expect(() => generatorSystem.use("gen.water_tap")).toThrow(GeneratorError);
    expect(currencies.energy).toBe(1);
    expect(generatorSystem.getState("gen.water_tap").chargesRemaining).toBe(3);
    expect(board.getCell(0, 0)).toMatchObject({ state: "EMPTY" });
    expect(emitted).toHaveLength(0);
  });

  it("leaves charges and energy untouched when the board is full", () => {
    for (const cell of board.allCells()) {
      board.placeItem(cell.x, cell.y, "item.dirt");
    }

    expect(() => generatorSystem.use("gen.water_tap")).toThrow(/Board is full/);
    expect(currencies.energy).toBe(100);
    expect(generatorSystem.getState("gen.water_tap").chargesRemaining).toBe(3);
    expect(emitted).toHaveLength(0);
  });

  it("persists cooldown state into the shared GeneratorSave array", () => {
    generatorSystem.use("gen.water_tap");

    expect(generatorSaves).toEqual([
      { generatorId: "gen.water_tap", chargesRemaining: 2, cooldownEndsAt: null },
    ]);
  });
});
