import { beforeEach, describe, expect, it } from "vitest";
import { Board } from "@domain/board/Board";
import { GeneratorRegistry } from "@domain/generators/GeneratorRegistry";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import type { CurrencySave, GeneratorSave } from "@domain/save/SaveDataV1";
import { BoardSystem } from "@systems/BoardSystem";
import { EnergySystem } from "@systems/EnergySystem";
import { GeneratorSystem } from "@systems/GeneratorSystem";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { testItems } from "../fixtures/testItems";

/**
 * A generator that refills fewer charges than it holds must still reach its
 * cap. Clearing the cooldown after one cycle silently capped it at
 * chargesPerCycle forever, because the cooldown was only re-armed when
 * charges hit zero.
 */
describe("GeneratorSystem — partial recharge reaches maxCharges", () => {
  let clock: { now: () => number };
  let time: number;
  let saves: GeneratorSave[];
  let system: GeneratorSystem;
  let currencies: CurrencySave;

  beforeEach(() => {
    time = 0;
    clock = { now: () => time };
    saves = [];
    currencies = { coins: 0, gems: 0, researchPoints: 0, energy: 1000, maxEnergy: 1000 };

    const bus = new EventBus<DomainEvent>();
    const items = new ItemRegistry(testItems);
    const generators = new GeneratorRegistry([
      {
        id: "gen.slow",
        outputItemId: "item.water",
        cooldownSeconds: 10,
        energyCost: 0,
        chargesPerCycle: 2,
        maxCharges: 5,
      },
    ]);
    const board = new Board(7, 9);
    const boardSystem = new BoardSystem(board, items, bus);
    const energy = new EnergySystem(currencies, clock, 0, bus);

    system = new GeneratorSystem(saves, generators, boardSystem, energy, bus, clock);
  });

  it("re-arms the cooldown while still below the cap, and stops once full", () => {
    for (let i = 0; i < 5; i += 1) {
      system.use("gen.slow");
    }
    expect(system.getState("gen.slow").chargesRemaining).toBe(0);
    expect(system.getState("gen.slow").cooldownEndsAt).not.toBeNull();

    time += 10_000; // one cycle
    expect(system.getState("gen.slow").chargesRemaining).toBe(2);
    expect(system.getState("gen.slow").cooldownEndsAt).not.toBeNull();

    time += 10_000; // second cycle
    expect(system.getState("gen.slow").chargesRemaining).toBe(4);

    time += 10_000; // third cycle clamps at the cap and disarms
    const state = system.getState("gen.slow");
    expect(state.chargesRemaining).toBe(5);
    expect(state.cooldownEndsAt).toBeNull();
  });

  it("credits one cycle per expiry, not one per elapsed cycle", () => {
    for (let i = 0; i < 5; i += 1) {
      system.use("gen.slow");
    }

    time += 10_000 * 50; // away for fifty cycles

    // Offline accrual is deliberately not a feature, here or in EnergySystem.
    expect(system.getState("gen.slow").chargesRemaining).toBe(2);
  });
});

describe("GeneratorSystem — cooldown deadlines stay save-schema valid", () => {
  it("rounds a fractional cooldown to a whole millisecond", () => {
    const bus = new EventBus<DomainEvent>();
    const saves: GeneratorSave[] = [];
    const generators = new GeneratorRegistry([
      {
        id: "gen.fractional",
        outputItemId: "item.water",
        cooldownSeconds: 0.0001, // 0.1 ms
        energyCost: 0,
        chargesPerCycle: 1,
        maxCharges: 1,
      },
    ]);
    const currencies: CurrencySave = {
      coins: 0,
      gems: 0,
      researchPoints: 0,
      energy: 10,
      maxEnergy: 10,
    };
    const clock = { now: () => 1000 };
    const boardSystem = new BoardSystem(new Board(7, 9), new ItemRegistry(testItems), bus);
    const system = new GeneratorSystem(
      saves,
      generators,
      boardSystem,
      new EnergySystem(currencies, clock, 0, bus),
      bus,
      clock,
    );

    system.use("gen.fractional");

    // GeneratorSaveSchema requires an integer; an unrounded deadline here
    // would make the very next save() throw.
    expect(Number.isInteger(saves[0]?.cooldownEndsAt)).toBe(true);
  });
});
