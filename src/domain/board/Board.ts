import type { BoardSave } from "@domain/save/SaveDataV1";
import { type BoardCell, cellKey } from "@domain/board/BoardCell";

/**
 * Pure grid state. No Phaser, no I/O — BoardSystem wraps this with
 * validation/events, and infrastructure/persistence handles serialization
 * to/from localStorage.
 */
export class Board {
  readonly cols: number;
  readonly rows: number;
  private readonly cells: Map<string, BoardCell>;

  constructor(cols: number, rows: number, cells?: readonly BoardCell[]) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Map();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.cells.set(cellKey(x, y), { x, y, state: "EMPTY" });
      }
    }

    for (const cell of cells ?? []) {
      if (!this.isValidCoordinate(cell.x, cell.y)) {
        throw new Error(`Board cell (${cell.x},${cell.y}) is outside the ${cols}x${rows} grid`);
      }
      this.cells.set(cellKey(cell.x, cell.y), { ...cell });
    }
  }

  isValidCoordinate(x: number, y: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x < this.cols &&
      y >= 0 &&
      y < this.rows
    );
  }

  getCell(x: number, y: number): BoardCell {
    const cell = this.cells.get(cellKey(x, y));
    if (!cell) {
      throw new Error(`Board cell (${x},${y}) is outside the ${this.cols}x${this.rows} grid`);
    }
    return cell;
  }

  isEmpty(x: number, y: number): boolean {
    return this.getCell(x, y).state === "EMPTY";
  }

  /** Mutates the cell at (x,y) to hold `itemId`. Caller (BoardSystem) is responsible for validation. */
  placeItem(x: number, y: number, itemId: string): void {
    const cell = this.getCell(x, y);
    cell.state = "OCCUPIED";
    cell.itemId = itemId;
  }

  /** Clears the cell at (x,y) back to EMPTY and returns the itemId that was there, if any. */
  removeItem(x: number, y: number): string | undefined {
    const cell = this.getCell(x, y);
    const itemId = cell.itemId;
    cell.state = "EMPTY";
    cell.itemId = undefined;
    return itemId;
  }

  /** All cells in stable row-major order (y then x), matching the 63-cell invariant for a 7x9 grid. */
  allCells(): readonly BoardCell[] {
    const result: BoardCell[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        result.push(this.getCell(x, y));
      }
    }
    return result;
  }

  toSave(): BoardSave {
    return {
      cols: this.cols,
      rows: this.rows,
      cells: this.allCells().map((cell) => ({ ...cell })),
    };
  }

  static fromSave(save: BoardSave): Board {
    return new Board(save.cols, save.rows, save.cells);
  }

  static createEmpty(cols: number, rows: number): Board {
    return new Board(cols, rows);
  }
}
