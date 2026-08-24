import type { GeneratorRegistry } from "@domain/generators/GeneratorRegistry";
import type { GeneratorSave } from "@domain/save/SaveDataV1";
import type { BoardPosition, DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { BoardSystem } from "@systems/BoardSystem";
import type { EnergySystem } from "@systems/EnergySystem";
import type { Clock } from "@infrastructure/clock/Clock";

export class GeneratorError extends Error {}

export interface UseGeneratorResult {
  readonly outputItemId: string;
  readonly position: BoardPosition;
  readonly chargesRemaining: number;
}

/**
 * Generator actions are atomic (A7): everything is validated — charges,
 * energy, board space — before any state is mutated, so a rejected action
 * leaves charges, energy and board untouched.
 *
 * Cooldown state lives in GeneratorSave and is expressed as an absolute
 * timestamp, so it survives a restart rather than restarting from zero.
 */
export class GeneratorSystem {
  constructor(
    private readonly generatorSaves: GeneratorSave[],
    private readonly registry: GeneratorRegistry,
    private readonly boardSystem: BoardSystem,
    private readonly energySystem: EnergySystem,
    private readonly eventBus: EventBus<DomainEvent>,
    private readonly clock: Clock,
  ) {}

  /** Generator state, creating a fully-charged entry on first use. */
  getState(generatorId: string): GeneratorSave {
    const definition = this.registry.requireById(generatorId);
    let state = this.generatorSaves.find((save) => save.generatorId === generatorId);

    if (!state) {
      state = {
        generatorId,
        chargesRemaining: definition.maxCharges,
        cooldownEndsAt: null,
      };
      this.generatorSaves.push(state);
    }

    this.refreshCharges(state);
    return state;
  }

  isOnCooldown(generatorId: string): boolean {
    const state = this.getState(generatorId);
    return state.cooldownEndsAt !== null && this.clock.now() < state.cooldownEndsAt;
  }

  use(generatorId: string): UseGeneratorResult {
    const definition = this.registry.requireById(generatorId);
    const state = this.getState(generatorId);

    if (state.chargesRemaining <= 0) {
      throw new GeneratorError(`${generatorId} has no charges remaining`);
    }
    if (!this.energySystem.canSpend(definition.energyCost)) {
      throw new GeneratorError(`Not enough energy to use ${generatorId}`);
    }

    const target = this.boardSystem.findFirstEmptyCell();
    if (!target) {
      throw new GeneratorError("Board is full — no space for generator output");
    }

    this.energySystem.spend(definition.energyCost);
    state.chargesRemaining -= 1;
    if (state.chargesRemaining <= 0) {
      state.cooldownEndsAt = this.clock.now() + definition.cooldownSeconds * 1000;
    }

    const position = this.boardSystem.spawnItem(definition.outputItemId, target);

    this.eventBus.emit({
      type: "GENERATOR_USED",
      generatorId,
      outputItemId: definition.outputItemId,
      position,
      chargesRemaining: state.chargesRemaining,
    });

    return {
      outputItemId: definition.outputItemId,
      position,
      chargesRemaining: state.chargesRemaining,
    };
  }

  /** Refills charges once the cooldown has elapsed. */
  private refreshCharges(state: GeneratorSave): void {
    if (state.cooldownEndsAt === null || this.clock.now() < state.cooldownEndsAt) {
      return;
    }

    const definition = this.registry.requireById(state.generatorId);
    state.chargesRemaining = Math.min(
      definition.maxCharges,
      state.chargesRemaining + definition.chargesPerCycle,
    );
    state.cooldownEndsAt = null;
  }
}
