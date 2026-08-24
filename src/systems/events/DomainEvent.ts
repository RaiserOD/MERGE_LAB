/**
 * Events describe completed state changes (A22). This union covers only
 * events actually emitted by systems that exist so far (board/merge/spawn
 * and generators). Order/quest/progression/currency events
 * (ORDER_COMPLETED, ITEM_DISCOVERED, CURRENCY_CHANGED, ...) get added here
 * as their producing systems are built — see A22 for the full target
 * vocabulary. Not to be confused with content/events/ (temporary in-game
 * events like "Alien Samples").
 */
export interface BoardPosition {
  readonly x: number;
  readonly y: number;
}

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
    };

export type DomainEventType = DomainEvent["type"];
