/**
 * Events describe completed state changes. Every system built so far
 * emits through this union: board/merge/spawn, generators, energy, economy,
 * orders, progression and quests. Not to be confused with content/events/
 * (temporary in-game events like "Alien Samples").
 */
export interface BoardPosition {
  readonly x: number;
  readonly y: number;
}

/** Currencies mutated through EconomySystem. Energy is paced by EnergySystem, not economy. */
export type CurrencyKind = "coins" | "gems" | "researchPoints";

export type DomainEvent =
  | { type: "ITEM_SPAWNED"; itemId: string; position: BoardPosition }
  | { type: "ITEM_MOVED"; itemId: string; from: BoardPosition; to: BoardPosition }
  | {
      type: "ITEM_MERGED";
      consumedItemId: string;
      resultItemId: string;
      from: BoardPosition;
      to: BoardPosition;
    }
  | {
      type: "GENERATOR_USED";
      generatorId: string;
      outputItemId: string;
      position: BoardPosition;
      chargesRemaining: number;
    }
  | {
      type: "CURRENCY_CHANGED";
      currency: CurrencyKind;
      delta: number;
      newBalance: number;
    }
  | {
      type: "ORDER_COMPLETED";
      orderId: string;
      coinReward: number;
      researchReward: number;
      xpReward: number;
    }
  | { type: "PLAYER_LEVELED"; newLevel: number; totalXp: number }
  | { type: "LAB_UPGRADED"; newStage: number; title: string; coinCost: number }
  | { type: "CHAPTER_UNLOCKED"; chapterId: string }
  | { type: "ITEM_DISCOVERED"; itemId: string }
  | { type: "DIALOGUE_STARTED"; dialogueId: string; lineCount: number }
  | { type: "DIALOGUE_ADVANCED"; dialogueId: string; lineIndex: number }
  | { type: "DIALOGUE_COMPLETED"; dialogueId: string }
  | { type: "TUTORIAL_STEP_COMPLETED"; stepId: string; nextStepId: string | undefined }
  | { type: "TUTORIAL_COMPLETED" }
  | { type: "ENERGY_SPENT"; amount: number; remaining: number }
  | {
      type: "QUEST_COMPLETED";
      questId: string;
      coinReward: number;
      gemReward: number;
      researchReward: number;
    }
  | { type: "REWARDED_AD_STARTED"; placementId: string }
  | { type: "REWARDED_AD_COMPLETED"; placementId: string }
  | { type: "IAP_STARTED"; productId: string }
  | { type: "IAP_COMPLETED"; productId: string };

export type DomainEventType = DomainEvent["type"];
