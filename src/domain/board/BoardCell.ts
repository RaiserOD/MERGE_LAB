export type BoardCellState = "EMPTY" | "OCCUPIED" | "BLOCKED" | "LOCKED";

export interface BoardCell {
  readonly x: number;
  readonly y: number;
  state: BoardCellState;
  itemId?: string | undefined;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}
