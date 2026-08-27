import type { QuestDefinition } from "@domain/quests/QuestDefinition";
import type { QuestRegistry } from "@domain/quests/QuestRegistry";
import type { ProgressionSave, QuestSave } from "@domain/save/SaveDataV1";
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

  /**
   * Completes quests whose requirement the player has *already* satisfied,
   * for cases where the event that would have completed them fired before
   * the quest existed — a quest added to content after a player had already
   * upgraded the lab, or already discovered the item it asks for.
   *
   * Two deliberate limits:
   *
   * 1. **Only requirements answerable from persisted state.** `labStage` and
   *    `discoveredItemIds` are saved, so UPGRADE_LAB and DISCOVER_ITEM can
   *    be settled honestly. Nothing persists lifetime merges, coins earned,
   *    generator uses or energy spent, so MERGE_COUNT, EARN_COINS,
   *    USE_GENERATOR, SPEND_ENERGY, COMPLETE_ORDER and COMPLETE_QUEST are
   *    left alone. Crediting those would mean inventing a history.
   *
   * 2. **Only quests available to the player.** `isAvailable` is the gate:
   *    a quest the player never had access to must not pay out for progress
   *    they made before it was offered. Nothing gates quests today — every
   *    quest is live from first launch — so the default predicate says yes
   *    to all of them, which is accurate rather than permissive. When quest
   *    pools arrive (`ChapterDefinition.questPoolId` is reserved for them),
   *    they plug in here and the rule starts biting without this code
   *    changing.
   *
   * Returns the ids it completed, so a caller can report them.
   */
  reconcile(
    progression: Pick<ProgressionSave, "labStage" | "discoveredItemIds">,
    isAvailable: (quest: QuestDefinition) => boolean = () => true,
  ): string[] {
    const completed: string[] = [];

    for (const quest of this.registry.all()) {
      if (this.getState(quest.id).completed || !isAvailable(quest)) {
        continue;
      }
      if (!satisfiedByState(quest.requirement, progression)) {
        continue;
      }

      this.complete(quest);
      completed.push(quest.id);
    }

    return completed;
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

/**
 * Whether persisted progression already satisfies a requirement.
 *
 * Returns false for every counting requirement — not because they cannot be
 * satisfied, but because the save holds no lifetime counter to check them
 * against. A guess here would pay out for progress that may never have
 * happened.
 */
function satisfiedByState(
  requirement: ProgressionRequirement,
  progression: Pick<ProgressionSave, "labStage" | "discoveredItemIds">,
): boolean {
  switch (requirement.type) {
    case "UPGRADE_LAB":
      return progression.labStage >= requirement.labStage;

    case "DISCOVER_ITEM":
      return requirement.itemId === undefined
        ? progression.discoveredItemIds.length >= requirement.target
        : progression.discoveredItemIds.includes(requirement.itemId);

    default:
      return false;
  }
}
