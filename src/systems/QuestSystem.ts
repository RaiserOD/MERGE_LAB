import type { QuestDefinition } from "@domain/quests/QuestDefinition";
import type { QuestRegistry } from "@domain/quests/QuestRegistry";
import type { QuestSave } from "@domain/save/SaveDataV1";
import {
  matchesFilter,
  type ProgressionRequirement,
  type ProgressionRequirementType,
} from "@domain/progression/ProgressionRequirement";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { EconomySystem } from "@systems/EconomySystem";

/**
 * Quest progress is entirely event-driven: the system listens to what
 * other systems already announce rather than being called by them, so
 * gameplay systems stay unaware that quests exist.
 *
 * Completion is one-shot — a finished quest stops accruing progress and its
 * rewards are granted exactly once, so replaying events (or a quest whose
 * target is passed in a single step) can't pay out twice.
 *
 * The conditions are `ProgressionRequirement`s, shared with campaign levels
 * (ADR-0007). The evaluation below stays here rather than being extracted:
 * quests are its only consumer today, and the right shape for a shared
 * evaluator is clearer with two real callers than with one imagined.
 */
export class QuestSystem {
  constructor(
    private readonly questSaves: QuestSave[],
    private readonly registry: QuestRegistry,
    private readonly economySystem: EconomySystem,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  /** Subscribes to every event a quest requirement can progress on. Returns an unsubscribe function. */
  start(): () => void {
    const unsubscribes = [
      this.eventBus.on("ITEM_MERGED", () => {
        this.advanceAll("MERGE_COUNT", 1);
      }),
      this.eventBus.on("ITEM_DISCOVERED", (event) => {
        this.advanceAll("DISCOVER_ITEM", 1, (requirement) =>
          requirement.type === "DISCOVER_ITEM"
            ? matchesFilter(requirement.itemId, event.itemId)
            : false,
        );
      }),
      this.eventBus.on("ORDER_COMPLETED", (event) => {
        this.advanceAll("COMPLETE_ORDER", 1, (requirement) =>
          requirement.type === "COMPLETE_ORDER"
            ? matchesFilter(requirement.orderId, event.orderId)
            : false,
        );
      }),
      this.eventBus.on("CURRENCY_CHANGED", (event) => {
        // Only coins earned count towards EARN_COINS; spending must not undo progress.
        if (event.currency === "coins" && event.delta > 0) {
          this.advanceAll("EARN_COINS", event.delta);
        }
      }),
      this.eventBus.on("GENERATOR_USED", (event) => {
        this.advanceAll("USE_GENERATOR", 1, (requirement) =>
          requirement.type === "USE_GENERATOR"
            ? matchesFilter(requirement.generatorId, event.generatorId)
            : false,
        );
      }),
      this.eventBus.on("ENERGY_SPENT", (event) => {
        this.advanceAll("SPEND_ENERGY", event.amount);
      }),
      this.eventBus.on("QUEST_COMPLETED", (event) => {
        this.advanceAll("COMPLETE_QUEST", 1, (requirement) =>
          requirement.type === "COMPLETE_QUEST"
            ? matchesFilter(requirement.questId, event.questId)
            : false,
        );
      }),
      // UPGRADE_LAB is a threshold, not a count: it asks whether the player
      // is at a stage, so reaching it in one upgrade or three is the same.
      this.eventBus.on("LAB_UPGRADED", (event) => {
        for (const quest of this.registry.all()) {
          if (
            quest.requirement.type === "UPGRADE_LAB" &&
            event.newStage >= quest.requirement.labStage
          ) {
            this.complete(quest);
          }
        }
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }

  /** Quest state, creating a zeroed entry the first time a quest is touched. */
  getState(questId: string): QuestSave {
    this.registry.requireById(questId);
    let state = this.questSaves.find((save) => save.questId === questId);

    if (!state) {
      state = { questId, progress: 0, completed: false };
      this.questSaves.push(state);
    }

    return state;
  }

  isCompleted(questId: string): boolean {
    return this.getState(questId).completed;
  }

  private advanceAll(
    type: ProgressionRequirementType,
    amount: number,
    matches?: (requirement: ProgressionRequirement) => boolean,
  ): void {
    for (const quest of this.registry.all()) {
      if (quest.requirement.type !== type) {
        continue;
      }
      if (matches && !matches(quest.requirement)) {
        continue;
      }
      this.advance(quest, amount);
    }
  }

  private advance(quest: QuestDefinition, amount: number): void {
    if (amount <= 0 || quest.requirement.type === "UPGRADE_LAB") {
      return;
    }

    const state = this.getState(quest.id);
    if (state.completed) {
      return;
    }

    const target = quest.requirement.target;
    state.progress = Math.min(target, state.progress + amount);
    if (state.progress < target) {
      return;
    }

    this.complete(quest);
  }

  /** Pays out and emits, exactly once. Safe to call on an already-completed quest. */
  private complete(quest: QuestDefinition): void {
    const state = this.getState(quest.id);
    if (state.completed) {
      return;
    }

    state.completed = true;
    if (quest.requirement.type !== "UPGRADE_LAB") {
      state.progress = quest.requirement.target;
    }

    this.economySystem.grant("coins", quest.coinReward);
    this.economySystem.grant("gems", quest.gemReward);
    this.economySystem.grant("researchPoints", quest.researchReward);

    this.eventBus.emit({
      type: "QUEST_COMPLETED",
      questId: quest.id,
      coinReward: quest.coinReward,
      gemReward: quest.gemReward,
      researchReward: quest.researchReward,
    });
  }
}
