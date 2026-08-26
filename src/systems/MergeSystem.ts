import { Board } from "@domain/board/Board";
import type { ItemDefinition } from "@domain/items/ItemDefinition";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import type { BoardPosition, DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";

export class MergeError extends Error {}

export interface MergeResult {
  readonly consumedItemId: string;
  readonly resultItemId: string;
  readonly position: BoardPosition;
}

type MergeValidation =
  | { ok: true; sourceItem: ItemDefinition; targetItem: ItemDefinition; resultItem: ItemDefinition }
  | { ok: false; reason: string };

/**
 * Atomic merge transaction: VALIDATE -> CALCULATE -> MUTATE -> EMIT.
 * Persistence ("SAVE") is the caller's responsibility, not this system's.
 *
 * Merge condition: same mergeGroup AND same level AND a result item exists.
 * "Neither item is locked" is satisfied by requiring both cells to be
 * OCCUPIED — BLOCKED/LOCKED cells never hold a mergeable item in this model.
 */
export class MergeSystem {
  constructor(
    private readonly board: Board,
    private readonly registry: ItemRegistry,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  canMerge(from: BoardPosition, to: BoardPosition): boolean {
    return this.validate(from, to).ok;
  }

  /** Throws MergeError and leaves the board untouched if the merge is invalid. */
  merge(from: BoardPosition, to: BoardPosition): MergeResult {
    const validation = this.validate(from, to);
    if (!validation.ok) {
      throw new MergeError(validation.reason);
    }

    const { sourceItem, resultItem } = validation;

    this.board.removeItem(from.x, from.y);
    this.board.placeItem(to.x, to.y, resultItem.id);

    this.eventBus.emit({
      type: "ITEM_MERGED",
      consumedItemId: sourceItem.id,
      resultItemId: resultItem.id,
      from,
      to,
    });

    return { consumedItemId: sourceItem.id, resultItemId: resultItem.id, position: to };
  }

  private validate(from: BoardPosition, to: BoardPosition): MergeValidation {
    if (from.x === to.x && from.y === to.y) {
      return { ok: false, reason: "Cannot merge a cell with itself" };
    }

    const fromCell = this.board.getCell(from.x, from.y);
    const toCell = this.board.getCell(to.x, to.y);

    if (fromCell.state !== "OCCUPIED" || !fromCell.itemId) {
      return { ok: false, reason: `Source cell (${from.x},${from.y}) is not occupied` };
    }
    if (toCell.state !== "OCCUPIED" || !toCell.itemId) {
      return { ok: false, reason: `Target cell (${to.x},${to.y}) is not occupied` };
    }

    const sourceItem = this.registry.requireById(fromCell.itemId);
    const targetItem = this.registry.requireById(toCell.itemId);

    if (sourceItem.mergeGroup !== targetItem.mergeGroup || sourceItem.level !== targetItem.level) {
      return { ok: false, reason: "Items are not the same mergeGroup/level" };
    }
    if (!targetItem.resultItemId) {
      return { ok: false, reason: `${targetItem.id} has no further merge result` };
    }

    const resultItem = this.registry.getById(targetItem.resultItemId);
    if (!resultItem) {
      return { ok: false, reason: `resultItemId "${targetItem.resultItemId}" does not exist` };
    }

    return { ok: true, sourceItem, targetItem, resultItem };
  }
}
