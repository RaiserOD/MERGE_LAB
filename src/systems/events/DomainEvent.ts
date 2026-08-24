/**
 * Events describe completed state changes (A22). This union covers only
 * events actually emitted by systems that exist so far (board/merge/spawn,
 * Stage 2). Generator/order/quest/progression/currency events
 * (GENERATOR_USED, ORDER_COMPLETED, ITEM_DISCOVERED, ...) get added here as
 * their producing systems are built — see A22 for the full target
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
    };

export type DomainEventType = DomainEvent["type"];
