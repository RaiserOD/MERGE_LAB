import { beforeEach, describe, expect, it } from "vitest";
import type { CurrencySave } from "@domain/save/SaveDataV1";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { EnergySystem, InsufficientEnergyError } from "@systems/EnergySystem";
import { FixedClock } from "../fixtures/FixedClock";

function makeCurrencies(energy: number, maxEnergy = 100): CurrencySave {
  return { coins: 0, gems: 0, researchPoints: 0, energy, maxEnergy };
}

describe("EnergySystem", () => {
  let eventBus: EventBus<DomainEvent>;
  let emitted: DomainEvent[];

  beforeEach(() => {
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    eventBus.on("ENERGY_SPENT", (event) => emitted.push(event));
  });

  it("regenerates energy proportionally to elapsed time", () => {
    const currencies = makeCurrencies(10);
    const clock = new FixedClock(0);
    const system = new EnergySystem(currencies, clock, 1, eventBus);

    clock.advance(5_000);

    expect(system.getEnergy()).toBe(15);
  });

  it("clamps regeneration at maxEnergy", () => {
    const currencies = makeCurrencies(98);
    const clock = new FixedClock(0);
    const system = new EnergySystem(currencies, clock, 1, eventBus);

    clock.advance(60_000);

    expect(system.getEnergy()).toBe(100);
  });

  it("spends energy and emits ENERGY_SPENT", () => {
    const currencies = makeCurrencies(10);
    const system = new EnergySystem(currencies, new FixedClock(0), 0, eventBus);

    system.spend(4);

    expect(currencies.energy).toBe(6);
    expect(emitted).toEqual([{ type: "ENERGY_SPENT", amount: 4, remaining: 6 }]);
  });

  it("throws and leaves the balance untouched when energy is insufficient", () => {
    const currencies = makeCurrencies(3);
    const system = new EnergySystem(currencies, new FixedClock(0), 0, eventBus);

    expect(() => {
      system.spend(5);
    }).toThrow(InsufficientEnergyError);
    expect(currencies.energy).toBe(3);
    expect(emitted).toHaveLength(0);
  });

  it("treats a zero-cost spend as a no-op with no event", () => {
    const currencies = makeCurrencies(10);
    const system = new EnergySystem(currencies, new FixedClock(0), 0, eventBus);

    system.spend(0);

    expect(currencies.energy).toBe(10);
    expect(emitted).toHaveLength(0);
  });

  it("rejects a negative cost", () => {
    const system = new EnergySystem(makeCurrencies(10), new FixedClock(0), 0, eventBus);

    expect(() => {
      system.spend(-1);
    }).toThrow(/cannot be negative/);
  });
});
