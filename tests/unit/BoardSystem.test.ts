import { beforeEach, describe, expect, it } from "vitest";
import { Board } from "@domain/board/Board";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { BoardSystem } from "@systems/BoardSystem";
import { testItems } from "../fixtures/testItems";

describe("BoardSystem", () => {
  let board: Board;
  let registry: ItemRegistry;
  let eventBus: EventBus<DomainEvent>;
  let boardSystem: BoardSystem;
  let emitted: DomainEvent[];

  beforeEach(() => {
    board = Board.createEmpty(2, 1);
    registry = new ItemRegistry(testItems);
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    eventBus.on("ITEM_SPAWNED", (event) => emitted.push(event));
    eventBus.on("ITEM_MOVED", (event) => emitted.push(event));
    boardSystem = new BoardSystem(board, registry, eventBus);
  });

  it("spawns into the first empty cell in row-major order", () => {
    const position = boardSystem.spawnItem("item.water");

    expect(position).toEqual({ x: 0, y: 0 });
    expect(board.getCell(0, 0)).toMatchObject({ itemId: "item.water" });
    expect(emitted).toEqual([
      { type: "ITEM_SPAWNED", itemId: "item.water", position: { x: 0, y: 0 } },
    ]);
  });

  it("throws when spawning an unknown item id", () => {
    expect(() => boardSystem.spawnItem("item.does-not-exist")).toThrow(/unknown item/);
  });

  it("throws when the board has no empty cell left", () => {
    boardSystem.spawnItem("item.water", { x: 0, y: 0 });
    boardSystem.spawnItem("item.water", { x: 1, y: 0 });

    expect(() => boardSystem.spawnItem("item.water")).toThrow(/no empty cell/);
  });

  it("moves an item between cells and emits ITEM_MOVED", () => {
    boardSystem.spawnItem("item.water", { x: 0, y: 0 });

    boardSystem.moveItem({ x: 0, y: 0 }, { x: 1, y: 0 });

    expect(board.getCell(0, 0)).toMatchObject({ state: "EMPTY" });
    expect(board.getCell(1, 0)).toMatchObject({ itemId: "item.water" });
    expect(emitted).toContainEqual({
      type: "ITEM_MOVED",
      itemId: "item.water",
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    });
  });

  it("rejects moving onto an occupied cell", () => {
    boardSystem.spawnItem("item.water", { x: 0, y: 0 });
    boardSystem.spawnItem("item.dirt", { x: 1, y: 0 });

    expect(() => {
      boardSystem.moveItem({ x: 0, y: 0 }, { x: 1, y: 0 });
    }).toThrow(/not empty/);
  });
});
