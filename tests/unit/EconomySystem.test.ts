import { beforeEach, describe, expect, it } from "vitest";
import type { CurrencySave } from "@domain/save/SaveDataV1";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { EconomySystem, InsufficientFundsError } from "@systems/EconomySystem";

describe("EconomySystem", () => {
  let currencies: CurrencySave;
  let eventBus: EventBus<DomainEvent>;
  let emitted: DomainEvent[];
  let economy: EconomySystem;

  beforeEach(() => {
    currencies = { coins: 10, gems: 0, researchPoints: 0, energy: 100, maxEnergy: 100 };
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    eventBus.on("CURRENCY_CHANGED", (event) => emitted.push(event));
    economy = new EconomySystem(currencies, eventBus);
  });

  it("grants currency and emits CURRENCY_CHANGED", () => {
    economy.grant("coins", 15);

    expect(currencies.coins).toBe(25);
    expect(emitted).toEqual([
      { type: "CURRENCY_CHANGED", currency: "coins", delta: 15, newBalance: 25 },
    ]);
  });

  it("spends currency and emits a negative delta", () => {
    economy.spend("coins", 4);

    expect(currencies.coins).toBe(6);
    expect(emitted).toEqual([
      { type: "CURRENCY_CHANGED", currency: "coins", delta: -4, newBalance: 6 },
    ]);
  });

  it("refuses to overspend, leaving the balance and event log untouched", () => {
    expect(() => {
      economy.spend("coins", 11);
    }).toThrow(InsufficientFundsError);

    expect(currencies.coins).toBe(10);
    expect(emitted).toHaveLength(0);
  });

  it("treats a zero-amount change as a no-op with no event", () => {
    economy.grant("gems", 0);
    economy.spend("gems", 0);

    expect(currencies.gems).toBe(0);
    expect(emitted).toHaveLength(0);
  });

  it("rejects fractional and negative amounts", () => {
    expect(() => {
      economy.grant("coins", 1.5);
    }).toThrow(/non-negative integer/);
    expect(() => {
      economy.spend("coins", -1);
    }).toThrow(/non-negative integer/);
    expect(currencies.coins).toBe(10);
  });

  it("tracks each currency independently", () => {
    economy.grant("gems", 3);
    economy.grant("researchPoints", 7);

    expect(economy.getBalance("gems")).toBe(3);
    expect(economy.getBalance("researchPoints")).toBe(7);
    expect(economy.getBalance("coins")).toBe(10);
  });
});
