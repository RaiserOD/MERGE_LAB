import type { BoardSectionDefinition } from "@domain/board/BoardSectionDefinition";

function row(y: number, cols: number): { x: number; y: number }[] {
  return Array.from({ length: cols }, (_, x) => ({ x, y }));
}

/**
 * A 3x3 test board split into three one-row sections: open, gated on lab
 * stage, gated on the section before it being paid for. Small enough to
 * assert on cell-by-cell, shaped like the real content.
 */
export const testBoardSections: BoardSectionDefinition[] = [
  {
    id: "board.starter",
    sectionNumber: 1,
    title: "Starter",
    cells: row(0, 3),
    unlockConditions: [],
    unlockCost: 0,
  },
  {
    id: "board.middle",
    sectionNumber: 2,
    title: "Middle",
    cells: row(1, 3),
    unlockConditions: ["labStage>=2"],
    unlockCost: 40,
  },
  {
    id: "board.far",
    sectionNumber: 3,
    title: "Far",
    cells: row(2, 3),
    unlockConditions: ["playerLevel>=3"],
    unlockCost: 100,
  },
];
