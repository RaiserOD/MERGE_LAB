import type { ProgressionSave } from "@domain/save/SaveDataV1";
import type {
  TutorialCompletion,
  TutorialStepDefinition,
} from "@domain/tutorial/TutorialStepDefinition";
import type { TutorialRegistry } from "@domain/tutorial/TutorialRegistry";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";

/**
 * Drives the A3 opening beats (ML-027). The tutorial observes the same
 * domain events quests do rather than gating input: a player who works out
 * the merge before being told is never blocked waiting for the banner, and
 * gameplay systems stay unaware a tutorial exists.
 *
 * Progress is stored by step id, so inserting or reordering steps in
 * content cannot strand an existing save mid-tutorial.
 */
export class TutorialSystem {
  constructor(
    private readonly progression: ProgressionSave,
    private readonly registry: TutorialRegistry,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  /** Subscribes to every event any step can complete on. Returns an unsubscribe function. */
  start(): () => void {
    const unsubscribes = [
      this.eventBus.on("ITEM_MERGED", (event) => {
        this.tryComplete(
          (completion) =>
            completion.event === "ITEM_MERGED" &&
            matchesFilter(completion.resultItemId, event.resultItemId),
        );
      }),
      this.eventBus.on("ITEM_DISCOVERED", (event) => {
        this.tryComplete(
          (completion) =>
            completion.event === "ITEM_DISCOVERED" &&
            matchesFilter(completion.itemId, event.itemId),
        );
      }),
      this.eventBus.on("GENERATOR_USED", (event) => {
        this.tryComplete(
          (completion) =>
            completion.event === "GENERATOR_USED" &&
            matchesFilter(completion.generatorId, event.generatorId),
        );
      }),
      this.eventBus.on("ORDER_COMPLETED", (event) => {
        this.tryComplete(
          (completion) =>
            completion.event === "ORDER_COMPLETED" &&
            matchesFilter(completion.orderId, event.orderId),
        );
      }),
      this.eventBus.on("LAB_UPGRADED", () => {
        this.tryComplete((completion) => completion.event === "LAB_UPGRADED");
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }

  /** The first step not yet completed, or undefined once the tutorial is done. */
  getCurrentStep(): TutorialStepDefinition | undefined {
    return this.registry.all().find((step) => !this.isStepCompleted(step.id));
  }

  isStepCompleted(stepId: string): boolean {
    return this.progression.completedTutorialStepIds.includes(stepId);
  }

  isCompleted(): boolean {
    return this.getCurrentStep() === undefined;
  }

  /**
   * Completes the current step if the event matches it. Only the current
   * step can advance, so an event that happens to match a later step
   * doesn't skip the ones before it.
   */
  private tryComplete(matches: (completion: TutorialCompletion) => boolean): void {
    const step = this.getCurrentStep();
    if (!step || !matches(step.completedBy)) {
      return;
    }

    this.progression.completedTutorialStepIds.push(step.id);
    const nextStep = this.getCurrentStep();

    this.eventBus.emit({
      type: "TUTORIAL_STEP_COMPLETED",
      stepId: step.id,
      nextStepId: nextStep?.id,
    });

    if (!nextStep) {
      this.eventBus.emit({ type: "TUTORIAL_COMPLETED" });
    }
  }
}

/** An absent filter matches anything; a present one must match exactly. */
function matchesFilter(filter: string | undefined, actual: string): boolean {
  return filter === undefined || filter === actual;
}
