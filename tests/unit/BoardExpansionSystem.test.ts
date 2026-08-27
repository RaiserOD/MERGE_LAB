import { beforeEach, describe, expect, it } from "vitest";
import { Board } from "@domain/board/Board";
import { BoardSectionRegistry } from "@domain/board/BoardSectionRegistry";
import type { CurrencySave } from "@domain/save/SaveDataV1";
import type { UnlockContext } from "@domain/progression/UnlockCondition";
import { BoardExpansionError, BoardExpansionSystem } from "@systems/BoardExpansionSystem";
import { EconomySystem } from "@systems/EconomySystem";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { testBoardSections } from "../fixtures/testBoardSections";

describe("BoardExpansionSystem", () => {
  let board: Board;
  let currencies: CurrencySave;
  let eventBus: EventBus<DomainEvent>;
  let economy: EconomySystem;
  let context: { labStage: number; playerLevel: number };
  let system: BoardExpansionSystem;
  let events: Extract<DomainEvent, { type: "BOARD_SECTION_UNLOCKED" }>[];

  beforeEach(() => {
    const sections = new BoardSectionRegistry(testBoardSections);
    board = new Board(
      3,
      3,
      sections.initiallyLockedCells().map((cell) => ({ ...cell, state: "LOCKED" as const })),
    );
    currencies = { coins: 0, gems: 0, researchPoints: 0, energy: 100, maxEnergy: 100 };
    eventBus = new EventBus<DomainEvent>();
    economy = new EconomySystem(currencies, eventBus);
    context = { labStage: 1, playerLevel: 1 };

    const unlockContext: UnlockContext = {
      get labStage(): number {
        return context.labStage;
      },
      get playerLevel(): number {
        return context.playerLevel;
      },
      isChapterUnlocked: () => false,
    };

    system = new BoardExpansionSystem(board, sections, economy, unlockContext, eventBus);

    events = [];
    eventBus.on("BOARD_SECTION_UNLOCKED", (event) => events.push(event));
  });

  it("opens only the starter section on a new board", () => {
    expect(system.isUnlocked("board.starter")).toBe(true);
    expect(system.isUnlocked("board.middle")).toBe(false);
    expect(system.unlockedCellCount()).toBe(3);
    expect(board.getCell(0, 0).state).toBe("EMPTY");
    expect(board.getCell(0, 1).state).toBe("LOCKED");
  });

  it("reports the next locked section in order", () => {
    expect(system.nextLockedSection()?.id).toBe("board.middle");
  });

  it("refuses to unlock while conditions are unmet, even with the coins", () => {
    economy.grant("coins", 500);

    expect(system.conditionsMet("board.middle")).toBe(false);
    expect(system.canUnlock("board.middle")).toBe(false);
    expect(() => {
      system.unlockSection("board.middle");
    }).toThrow(BoardExpansionError);
    expect(currencies.coins).toBe(500);
    expect(board.getCell(0, 1).state).toBe("LOCKED");
  });

  it("refuses to unlock when conditions hold but coins are short", () => {
    context.labStage = 2;
    economy.grant("coins", 39);

    expect(system.conditionsMet("board.middle")).toBe(true);
    expect(system.canUnlock("board.middle")).toBe(false);
    expect(() => {
      system.unlockSection("board.middle");
    }).toThrow(/Need 40 coins/);
    expect(currencies.coins).toBe(39);
    expect(board.getCell(0, 1).state).toBe("LOCKED");
  });

  it("spends the coins, opens the cells and emits once", () => {
    context.labStage = 2;
    economy.grant("coins", 40);
    events.length = 0;

    system.unlockSection("board.middle");

    expect(currencies.coins).toBe(0);
    expect(board.getCell(0, 1).state).toBe("EMPTY");
    expect(board.getCell(2, 1).state).toBe("EMPTY");
    expect(board.getCell(0, 2).state).toBe("LOCKED");
    expect(system.unlockedCellCount()).toBe(6);
    expect(events).toContainEqual({
      type: "BOARD_SECTION_UNLOCKED",
      sectionId: "board.middle",
      title: "Middle",
      coinCost: 40,
      unlockedCells: 3,
    });
  });

  it("refuses to unlock the same section twice", () => {
    context.labStage = 2;
    economy.grant("coins", 100);
    system.unlockSection("board.middle");

    expect(() => {
      system.unlockSection("board.middle");
    }).toThrow(/already unlocked/);
    expect(currencies.coins).toBe(60);
  });

  it("throws on an unknown section id", () => {
    expect(() => {
      system.unlockSection("board.nowhere");
    }).toThrow(/Unknown board section/);
  });

  it("leaves items in place when a later section opens", () => {
    board.placeItem(1, 0, "item.water");
    context.labStage = 2;
    economy.grant("coins", 100);

    system.unlockSection("board.middle");

    expect(board.getCell(1, 0).state).toBe("OCCUPIED");
    expect(board.getCell(1, 0).itemId).toBe("item.water");
  });
});

/**
 * Regression: ActionBar calls nextLockedSection() on every redraw, so a
 * board that does not match the section content used to throw from deep
 * inside a UI refresh — breaking rendering on every interaction rather
 * than failing once at validation time.
 */
describe("BoardExpansionSystem — board smaller than its section content", () => {
  it("does not throw when a section names cells the board does not have", () => {
    const sections = new BoardSectionRegistry(testBoardSections);
    const board = new Board(2, 2); // content expects 3x3
    const bus = new EventBus<DomainEvent>();
    const economy = new EconomySystem(
      { coins: 0, gems: 0, researchPoints: 0, energy: 1, maxEnergy: 1 },
      bus,
    );
    const system = new BoardExpansionSystem(
      board,
      sections,
      economy,
      { labStage: 9, playerLevel: 9, isChapterUnlocked: () => false },
      bus,
    );

    expect(() => system.nextLockedSection()).not.toThrow();
    expect(() => system.isUnlocked("board.far")).not.toThrow();
    expect(() => system.unlockedCellCount()).not.toThrow();
  });
});
