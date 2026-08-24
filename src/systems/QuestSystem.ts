import type { QuestDefinition } from "@domain/quests/QuestDefinition";
import type { QuestRegistry } from "@domain/quests/QuestRegistry";
import type { QuestSave } from "@domain/save/SaveDataV1";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { EconomySystem } from "@systems/EconomySystem";

/**
 * Quest progress is entirely event-driven (A10): the system listens to what
 * other systems already announce rather than being called by them, so
 * gameplay systems stay unaware that quests exist.
 *
 * Completion is one-shot — a finished quest stops accruing progress and its
 * rewards are granted exactly once, so replaying events (or a quest whose
 * target is passed in a single step) can't pay out twice.
 */
export class QuestSystem {
  constructor(
    private readonly questSaves: QuestSave[],
    private readonly registry: QuestRegistry,
    private readonly economySystem: EconomySystem,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  /** Subscribes to every event quests can progress on. Returns an unsubscribe function. */
  start(): () => void {
    const unsubscribes = [
      this.eventBus.on("ITEM_MERGED", () => {
        this.advanceAll("MERGE_COUNT", 1);
      }),
      this.eventBus.on("ITEM_DISCOVERED", (event) => {
        this.advanceAll("DISCOVER_ITEM", 1, (quest) =>
          quest.type === "DISCOVER_ITEM" ? matchesFilter(quest.itemId, event.itemId) : false,
        );
      }),
      this.eventBus.on("ORDER_COMPLETED", (event) => {
        this.advanceAll("COMPLETE_ORDER", 1, (quest) =>
          quest.type === "COMPLETE_ORDER" ? matchesFilter(quest.orderId, event.orderId) : false,
        );
      }),
      this.eventBus.on("CURRENCY_CHANGED", (event) => {
        // Only coins earned count towards EARN_COINS; spending must not undo progress.
        if (event.currency === "coins" && event.delta > 0) {
          this.advanceAll("EARN_COINS", event.delta);
        }
      }),
      this.eventBus.on("LAB_UPGRADED", () => {
        this.advanceAll("UPGRADE_LAB", 1);
      }),
      this.eventBus.on("GENERATOR_USED", (event) => {
        this.advanceAll("USE_GENERATOR", 1, (quest) =>
          quest.type === "USE_GENERATOR"
            ? matchesFilter(quest.generatorId, event.generatorId)
            : false,
        );
      }),
      this.eventBus.on("ENERGY_SPENT", (event) => {
        this.advanceAll("SPEND_ENERGY", event.amount);
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
    type: QuestDefinition["type"],
    amount: number,
    matches?: (quest: QuestDefinition) => boolean,
  ): void {
    for (const quest of this.registry.all()) {
      if (quest.type !== type) {
        continue;
      }
      if (matches && !matches(quest)) {
        continue;
      }
      this.advance(quest, amount);
    }
  }

  private advance(quest: QuestDefinition, amount: number): void {
    if (amount <= 0) {
      return;
    }

    const state = this.getState(quest.id);
    if (state.completed) {
      return;
    }

    state.progress = Math.min(quest.target, state.progress + amount);
    if (state.progress < quest.target) {
      return;
    }

    state.completed = true;
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

/** An absent filter matches everything; a present one must match exactly. */
function matchesFilter(filter: string | undefined, actual: string): boolean {
  return filter === undefined || filter === actual;
}
