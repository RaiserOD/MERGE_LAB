import { describe, expect, it } from "vitest";

import type { BoardSectionDefinition } from "@domain/board/BoardSectionDefinition";
import { runtimeConfig } from "@config/runtime";

import { validateBoardSections } from "../../tools/content-validator/index";

/**
 * Board sections must partition the 7x9 grid exactly (canon §39). A gap
 * leaves a cell unreachable for the whole campaign and a duplicate would
 * let two purchases unlock the same square, so both are validator errors
 * rather than something a system copes with at runtime.
 */
function everyCell(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < runtimeConfig.boardRows; y += 1) {
    for (let x = 0; x < runtimeConfig.boardCols; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}

function section(overrides: Partial<BoardSectionDefinition> = {}): BoardSectionDefinition {
  return {
    id: "board.starter",
    sectionNumber: 1,
    title: "Starter",
    cells: everyCell(),
    unlockConditions: [],
    unlockCost: 0,
    ...overrides,
  };
}

const noChapters = new Set<string>();

describe("content validator — board sections", () => {
  it("accepts a single section covering the whole board", () => {
    expect(validateBoardSections([section()], noChapters)).toEqual([]);
  });

  it("accepts a partition across several sections", () => {
    const all = everyCell();
    const errors = validateBoardSections(
      [
        section({ cells: all.slice(0, 21) }),
        section({
          id: "board.rest",
          sectionNumber: 2,
          title: "Rest",
          cells: all.slice(21),
          unlockConditions: ["labStage>=2"],
          unlockCost: 40,
        }),
      ],
      noChapters,
    );

    expect(errors).toEqual([]);
  });

  it("reports a cell no section claims", () => {
    const errors = validateBoardSections(
      [section({ cells: everyCell().slice(0, -1) })],
      noChapters,
    );

    expect(errors).toEqual(["Board cell (6,8) belongs to no section"]);
  });

  it("reports a cell two sections both claim, naming both", () => {
    const all = everyCell();
    const errors = validateBoardSections(
      [
        section({ cells: all.slice(0, 21) }),
        section({
          id: "board.rest",
          sectionNumber: 2,
          title: "Rest",
          cells: all.slice(20),
          unlockCost: 40,
        }),
      ],
      noChapters,
    );

    expect(errors).toContain("Board cell (6,2) is claimed by both board.starter and board.rest");
  });

  it("reports a cell outside the grid", () => {
    const errors = validateBoardSections(
      [section({ cells: [...everyCell(), { x: 7, y: 0 }] })],
      noChapters,
    );

    expect(errors).toContain("board.starter: cell (7,0) is outside the 7x9 board");
  });

  it("rejects a starter section that is gated or priced", () => {
    const errors = validateBoardSections(
      [section({ unlockConditions: ["labStage>=2"], unlockCost: 10 })],
      noChapters,
    );

    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/cannot carry unlock conditions/);
    expect(errors[1]).toMatch(/unlockCost must be 0/);
  });

  it("rejects an unsupported unlock condition", () => {
    const all = everyCell();
    const errors = validateBoardSections(
      [
        section({ cells: all.slice(0, 21) }),
        section({
          id: "board.rest",
          sectionNumber: 2,
          title: "Rest",
          cells: all.slice(21),
          unlockConditions: ["whenTheProfessorSaysSo"],
          unlockCost: 40,
        }),
      ],
      noChapters,
    );

    expect(errors).toEqual(['board.rest: unsupported unlock condition "whenTheProfessorSaysSo"']);
  });

  it("rejects a chapter reference that names no chapter", () => {
    const all = everyCell();
    const errors = validateBoardSections(
      [
        section({ cells: all.slice(0, 21) }),
        section({
          id: "board.rest",
          sectionNumber: 2,
          title: "Rest",
          cells: all.slice(21),
          unlockConditions: ["chapterUnlocked:chapter.ghost"],
          unlockCost: 40,
        }),
      ],
      new Set(["chapter.basement"]),
    );

    expect(errors).toEqual([
      'board.rest: unlock condition references unknown chapter "chapter.ghost"',
    ]);
  });

  it("reports a gap in section numbering", () => {
    const all = everyCell();
    const errors = validateBoardSections(
      [
        section({ cells: all.slice(0, 21) }),
        section({
          id: "board.rest",
          sectionNumber: 3,
          title: "Rest",
          cells: all.slice(21),
          unlockCost: 40,
        }),
      ],
      noChapters,
    );

    expect(errors).toContain(
      "Board section numbering has a gap: 2 section(s) defined, but none has sectionNumber 2",
    );
  });
});
