import { describe, expect, it } from "vitest";
import type { CurrencySave } from "@domain/save/SaveDataV1";
import { EnergySystem, InsufficientEnergyError } from "@systems/EnergySystem";
import { FixedClock } from "../fixtures/FixedClock";

function makeCurrencies(energy: number, maxEnergy = 100): CurrencySave {
  return { coins: 0, gems: 0, researchPoints: 0, energy, maxEnergy };
}

describe("EnergySystem", () => {
  it("regenerates energy proportionally to elapsed time", () => {
    const currencies = makeCurrencies(10);
    const clock = new FixedClock(0);
    const system = new EnergySystem(currencies, clock, 1);

    clock.advance(5_000);

    expect(system.getEnergy()).toBe(15);
  });

  it("clamps regeneration at maxEnergy", () => {
    const currencies = makeCurrencies(98);
    const clock = new FixedClock(0);
    const system = new EnergySystem(currencies, clock, 1);

    clock.advance(60_000);

    expect(system.getEnergy()).toBe(100);
  });

  it("spends energy when affordable", () => {
    const currencies = makeCurrencies(10);
    const system = new EnergySystem(currencies, new FixedClock(0), 0);

    system.spend(4);

    expect(currencies.energy).toBe(6);
  });

  it("throws and leaves the balance untouched when energy is insufficient", () => {
    const currencies = makeCurrencies(3);
    const system = new EnergySystem(currencies, new FixedClock(0), 0);

    expect(() => {
      system.spend(5);
    }).toThrow(InsufficientEnergyError);
    expect(currencies.energy).toBe(3);
  });

  it("rejects a negative cost", () => {
    const system = new EnergySystem(makeCurrencies(10), new FixedClock(0), 0);

    expect(() => {
      system.spend(-1);
    }).toThrow(/cannot be negative/);
  });
});
