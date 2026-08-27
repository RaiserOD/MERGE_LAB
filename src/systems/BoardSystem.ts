import { Board } from "@domain/board/Board";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import type { BoardPosition, DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";

/** Board mutations (spawn/move) with validation and event emission. Merge lives in MergeSystem. */
export class BoardSystem {
  constructor(
    private readonly board: Board,
    private readonly registry: ItemRegistry,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  getBoard(): Board {
    return this.board;
  }

  /** First empty cell in stable row-major order — the deterministic placement policy from A7. */
  findFirstEmptyCell(): BoardPosition | undefined {
    for (const cell of this.board.allCells()) {
      if (cell.state === "EMPTY") {
        return { x: cell.x, y: cell.y };
      }
    }
    return undefined;
  }

  /** Whether `itemId` is a real item — lets callers validate before spending anything. */
  canSpawn(itemId: string): boolean {
    return this.registry.has(itemId);
  }

  spawnItem(itemId: string, at?: BoardPosition): BoardPosition {
    if (!this.registry.has(itemId)) {
      throw new Error(`Cannot spawn unknown item: ${itemId}`);
    }

    const position = at ?? this.findFirstEmptyCell();
    if (!position) {
      throw new Error("Board is full — no empty cell available for spawn");
    }
    if (!this.board.isEmpty(position.x, position.y)) {
      throw new Error(`Cell (${position.x},${position.y}) is not empty`);
    }

    this.board.placeItem(position.x, position.y, itemId);
    this.eventBus.emit({ type: "ITEM_SPAWNED", itemId, position });
    return position;
  }

  moveItem(from: BoardPosition, to: BoardPosition): void {
    const fromCell = this.board.getCell(from.x, from.y);
    if (fromCell.state !== "OCCUPIED" || !fromCell.itemId) {
      throw new Error(`Source cell (${from.x},${from.y}) has no item to move`);
    }
    if (!this.board.isEmpty(to.x, to.y)) {
      throw new Error(`Destination cell (${to.x},${to.y}) is not empty`);
    }

    const itemId = this.board.removeItem(from.x, from.y);
    if (!itemId) {
      throw new Error(`Source cell (${from.x},${from.y}) has no item to move`);
    }
    this.board.placeItem(to.x, to.y, itemId);
    this.eventBus.emit({ type: "ITEM_MOVED", itemId, from, to });
  }
}
