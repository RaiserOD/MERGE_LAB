import { describe, expect, it } from "vitest";
import { Board } from "@domain/board/Board";

describe("Board", () => {
  it("has exactly 63 cells for the 7x9 MVP grid, all EMPTY", () => {
    const board = Board.createEmpty(7, 9);
    const cells = board.allCells();

    expect(cells).toHaveLength(63);
    expect(cells.every((cell) => cell.state === "EMPTY")).toBe(true);
  });

  it("places and removes an item on a cell", () => {
    const board = Board.createEmpty(7, 9);

    board.placeItem(2, 3, "item.water");
    expect(board.getCell(2, 3)).toMatchObject({ state: "OCCUPIED", itemId: "item.water" });
    expect(board.isEmpty(2, 3)).toBe(false);

    const removed = board.removeItem(2, 3);
    expect(removed).toBe("item.water");
    expect(board.getCell(2, 3)).toMatchObject({ state: "EMPTY" });
  });

  it("rejects out-of-bounds coordinates", () => {
    const board = Board.createEmpty(7, 9);
    expect(board.isValidCoordinate(7, 0)).toBe(false);
    expect(board.isValidCoordinate(0, 9)).toBe(false);
    expect(() => board.getCell(-1, 0)).toThrow();
  });

  it("round-trips through toSave/fromSave", () => {
    const board = Board.createEmpty(7, 9);
    board.placeItem(0, 0, "item.water");
    board.placeItem(6, 8, "item.dirt");

    const restored = Board.fromSave(board.toSave());

    expect(restored.cols).toBe(7);
    expect(restored.rows).toBe(9);
    expect(restored.getCell(0, 0)).toMatchObject({ state: "OCCUPIED", itemId: "item.water" });
    expect(restored.getCell(6, 8)).toMatchObject({ state: "OCCUPIED", itemId: "item.dirt" });
    expect(restored.allCells()).toHaveLength(63);
  });
});
