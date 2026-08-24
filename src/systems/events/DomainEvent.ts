/**
 * Events describe completed state changes (A22). This union covers only
 * events actually emitted by systems that exist so far (board/merge/spawn,
 * generators, economy and orders). Quest/progression events
 * (QUEST_COMPLETED, ITEM_DISCOVERED, LAB_UPGRADED, ...) get added here as
 * their producing systems are built — see A22 for the full target
 * vocabulary. Not to be confused with content/events/ (temporary in-game
 * events like "Alien Samples").
 */
export interface BoardPosition {
  readonly x: number;
  readonly y: number;
}

/** Currencies mutated through EconomySystem. Energy is paced by EnergySystem, not economy (A16). */
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
    };

export type DomainEventType = DomainEvent["type"];
