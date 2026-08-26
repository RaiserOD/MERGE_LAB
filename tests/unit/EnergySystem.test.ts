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

  // grant() exists so "energy changes only through EnergySystem" is a rule
  // callers can keep — before it, adding energy meant writing the field.
  describe("grant", () => {
    // Regen is 0 in these so the clock cannot mask what grant() itself does.
    function makeSystem(energy: number) {
      const currencies = makeCurrencies(energy);
      const system = new EnergySystem(currencies, new FixedClock(0), 0, eventBus);
      return { currencies, system };
    }

    it("adds energy up to the cap", () => {
      const { system } = makeSystem(70);

      system.grant(20);

      expect(system.getEnergy()).toBe(90);
    });

    it("clamps at the cap rather than overflowing", () => {
      const { currencies, system } = makeSystem(90);

      system.grant(1000);

      expect(system.getEnergy()).toBe(currencies.maxEnergy);
    });

    it("rejects a negative grant instead of silently draining", () => {
      const { system } = makeSystem(50);

      expect(() => {
        system.grant(-5);
      }).toThrow(/non-negative/);
      expect(system.getEnergy()).toBe(50);
    });

    it("emits nothing — gaining energy is not an observed action", () => {
      const { system } = makeSystem(50);

      system.grant(10);

      expect(emitted).toHaveLength(0);
    });

    it("refill() fills the bar to the cap", () => {
      const { currencies, system } = makeSystem(25);

      system.refill();

      expect(system.getEnergy()).toBe(currencies.maxEnergy);
    });
  });
});
