import type { CurrencySave } from "@domain/save/SaveDataV1";
import type { CurrencyKind, DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";

export class InsufficientFundsError extends Error {}

/**
 * The only place coins/gems/researchPoints are allowed to change.
 * Every mutation is validated against the no-negative-balance rule and
 * emits CURRENCY_CHANGED, so UI and analytics can react without polling.
 *
 * Energy is deliberately out of scope here — it paces actions rather than
 * acting as a spendable balance, and lives in EnergySystem.
 */
export class EconomySystem {
  constructor(
    private readonly currencies: CurrencySave,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  getBalance(currency: CurrencyKind): number {
    return this.currencies[currency];
  }

  canAfford(currency: CurrencyKind, amount: number): boolean {
    return this.currencies[currency] >= amount;
  }

  grant(currency: CurrencyKind, amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(`Grant amount must be a non-negative integer, got ${amount}`);
    }
    if (amount === 0) {
      return;
    }

    this.currencies[currency] += amount;
    this.emitChange(currency, amount);
  }

  /** Throws InsufficientFundsError without mutating when the balance is too low. */
  spend(currency: CurrencyKind, amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(`Spend amount must be a non-negative integer, got ${amount}`);
    }
    if (!this.canAfford(currency, amount)) {
      throw new InsufficientFundsError(
        `Need ${amount} ${currency} but only ${this.currencies[currency]} available`,
      );
    }
    if (amount === 0) {
      return;
    }

    this.currencies[currency] -= amount;
    this.emitChange(currency, -amount);
  }

  private emitChange(currency: CurrencyKind, delta: number): void {
    this.eventBus.emit({
      type: "CURRENCY_CHANGED",
      currency,
      delta,
      newBalance: this.currencies[currency],
    });
  }
}
