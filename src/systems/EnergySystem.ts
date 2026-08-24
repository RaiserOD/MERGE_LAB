import type { CurrencySave } from "@domain/save/SaveDataV1";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { Clock } from "@infrastructure/clock/Clock";

export class InsufficientEnergyError extends Error {}

/**
 * Energy pacing (A8). Regeneration is a pure function of elapsed time —
 * `lastRegenAt` is tracked in-system rather than in the save, so a restart
 * simply resumes regen from the load moment. Offline regen (crediting time
 * spent with the game closed) is a separate feature and deliberately not
 * implemented here.
 */
export class EnergySystem {
  private lastRegenAt: number;

  constructor(
    private readonly currencies: CurrencySave,
    private readonly clock: Clock,
    private readonly regenPerSecond: number,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {
    this.lastRegenAt = clock.now();
  }

  /** Applies regen accrued since the last call. Safe to call as often as you like. */
  update(): void {
    const now = this.clock.now();
    const elapsedSeconds = Math.max(0, (now - this.lastRegenAt) / 1000);
    this.lastRegenAt = now;

    this.currencies.energy = Math.min(
      this.currencies.maxEnergy,
      this.currencies.energy + elapsedSeconds * this.regenPerSecond,
    );
  }

  getEnergy(): number {
    this.update();
    return this.currencies.energy;
  }

  canSpend(amount: number): boolean {
    this.update();
    return this.currencies.energy >= amount;
  }

  /** Throws InsufficientEnergyError without mutating when the player can't afford `amount`. */
  spend(amount: number): void {
    if (amount < 0) {
      throw new Error("Energy cost cannot be negative");
    }
    if (!this.canSpend(amount)) {
      throw new InsufficientEnergyError(
        `Need ${amount} energy but only ${this.currencies.energy} available`,
      );
    }
    if (amount === 0) {
      return;
    }

    this.currencies.energy -= amount;
    this.eventBus.emit({
      type: "ENERGY_SPENT",
      amount,
      remaining: this.currencies.energy,
    });
  }
}
