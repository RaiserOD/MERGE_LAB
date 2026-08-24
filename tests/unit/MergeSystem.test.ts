import { beforeEach, describe, expect, it } from "vitest";
import { Board } from "@domain/board/Board";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { MergeError, MergeSystem } from "@systems/MergeSystem";
import { testItems } from "../fixtures/testItems";

describe("MergeSystem", () => {
  let board: Board;
  let registry: ItemRegistry;
  let eventBus: EventBus<DomainEvent>;
  let mergeSystem: MergeSystem;
  let emitted: DomainEvent[];

  beforeEach(() => {
    board = Board.createEmpty(7, 9);
    registry = new ItemRegistry(testItems);
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    eventBus.on("ITEM_MERGED", (event) => emitted.push(event));
    mergeSystem = new MergeSystem(board, registry, eventBus);
  });

  it("merges two same-level items of the same mergeGroup into the result item", () => {
    board.placeItem(0, 0, "item.water");
    board.placeItem(1, 0, "item.water");

    const result = mergeSystem.merge({ x: 0, y: 0 }, { x: 1, y: 0 });

    expect(result).toEqual({
      consumedItemId: "item.water",
      resultItemId: "item.steam",
      position: { x: 1, y: 0 },
    });
    expect(board.getCell(0, 0)).toMatchObject({ state: "EMPTY" });
    expect(board.getCell(1, 0)).toMatchObject({ state: "OCCUPIED", itemId: "item.steam" });
    expect(emitted).toEqual([
      {
        type: "ITEM_MERGED",
        consumedItemId: "item.water",
        resultItemId: "item.steam",
        from: { x: 0, y: 0 },
        to: { x: 1, y: 0 },
      },
    ]);
  });

  it("rejects merging items from different mergeGroups without mutating the board", () => {
    board.placeItem(0, 0, "item.water");
    board.placeItem(1, 0, "item.dirt");

    expect(() => mergeSystem.merge({ x: 0, y: 0 }, { x: 1, y: 0 })).toThrow(MergeError);
    expect(board.getCell(0, 0)).toMatchObject({ state: "OCCUPIED", itemId: "item.water" });
    expect(board.getCell(1, 0)).toMatchObject({ state: "OCCUPIED", itemId: "item.dirt" });
    expect(emitted).toHaveLength(0);
  });

  it("rejects merging an item that has no further result (max level)", () => {
    board.placeItem(0, 0, "item.steam");
    board.placeItem(1, 0, "item.steam");

    expect(() => mergeSystem.merge({ x: 0, y: 0 }, { x: 1, y: 0 })).toThrow(MergeError);
    expect(board.getCell(0, 0)).toMatchObject({ state: "OCCUPIED", itemId: "item.steam" });
    expect(emitted).toHaveLength(0);
  });

  it("rejects merging against an empty cell without mutating the board", () => {
    board.placeItem(0, 0, "item.water");

    expect(() => mergeSystem.merge({ x: 0, y: 0 }, { x: 1, y: 0 })).toThrow(MergeError);
    expect(board.getCell(0, 0)).toMatchObject({ state: "OCCUPIED", itemId: "item.water" });
    expect(board.getCell(1, 0)).toMatchObject({ state: "EMPTY" });
    expect(emitted).toHaveLength(0);
  });

  it("canMerge reports validity without mutating the board", () => {
    board.placeItem(0, 0, "item.water");
    board.placeItem(1, 0, "item.dirt");

    expect(mergeSystem.canMerge({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
    expect(board.getCell(0, 0)).toMatchObject({ itemId: "item.water" });
  });
});
