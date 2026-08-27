/**
 * Events describe completed state changes. Every system built so far
 * emits through this union: board/merge/spawn, generators, energy, economy,
 * orders, progression and quests. Not to be confused with the save's
 * `events` slot, which holds timed in-game events like "Alien Samples" and
 * has no system behind it yet.
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
  /**
   * The campaign has *offered* a section: its conditions now hold, so it can
   * be bought. Canon §3 puts "UNLOCK LEVEL CONTENT" and "EMIT
   * CONTENT_UNLOCKED" in the level-completion flow — this is that step for
   * board sections. Distinct from BOARD_SECTION_UNLOCKED, which is the
   * player paying for it (ADR-0012).
   */
  | { type: "BOARD_SECTION_OFFERED"; sectionId: string; title: string; coinCost: number }
  | {
      type: "BOARD_SECTION_UNLOCKED";
      sectionId: string;
      title: string;
      coinCost: number;
      unlockedCells: number;
    }
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
