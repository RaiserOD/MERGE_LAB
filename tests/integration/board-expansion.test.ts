import { describe, expect, it } from "vitest";
import { GameContext } from "@app/GameContext";
import type { AnalyticsEvent } from "@infrastructure/analytics/AnalyticsEvent";
import { InMemoryStorage } from "../fixtures/InMemoryStorage";
import { FixedClock } from "../fixtures/FixedClock";

/**
 * Board expansion through a real GameContext: real board-section content,
 * the real economy, the real save. Canon §39 says the board never changes
 * size and opens progressively — this asserts both ends of that, including
 * that the state survives a reload, which is the part cell-state-as-source-
 * of-truth (ADR-0011) is betting on.
 */
describe("Board expansion (integration)", () => {
  /**
   * Satisfies whatever gate `board.power_console` declares. The content
   * schedule follows canon §39's cadence, so the first expansion is keyed to
   * player level — but the test is about the mechanism, not the gate, and
   * should not break the next time the schedule is retuned.
   */
  function grantGate(context: GameContext): void {
    const section = context.boardSections.requireById("board.power_console");
    let guard = 0;
    while (!context.boardExpansionSystem.conditionsMet(section.id) && guard < 50) {
      context.progressionSystem.grantXp(100);
      if (context.progressionSystem.canUpgradeLab()) {
        context.progressionSystem.upgradeLab();
      }
      guard += 1;
    }
    expect(context.boardExpansionSystem.conditionsMet(section.id)).toBe(true);
  }

  function freshContext(storage: InMemoryStorage): GameContext {
    const context = new GameContext({ storage, clock: new FixedClock(0) });
    context.start();
    return context;
  }

  it("starts a new game with only the starter section open", () => {
    const context = freshContext(new InMemoryStorage());
    const board = context.state.board;

    expect(board.cols).toBe(7);
    expect(board.rows).toBe(9);
    expect(board.allCells()).toHaveLength(63);

    const starter = context.boardSections.requireById("board.starter_bench");
    expect(context.boardExpansionSystem.isUnlocked(starter.id)).toBe(true);
    expect(context.boardExpansionSystem.unlockedCellCount()).toBe(starter.cells.length);
    expect(context.boardExpansionSystem.nextLockedSection()?.id).toBe("board.power_console");
  });

  it("keeps locked cells out of spawn placement", () => {
    const context = freshContext(new InMemoryStorage());
    const starterCells = context.boardSections.requireById("board.starter_bench").cells.length;

    for (let i = 0; i < starterCells; i += 1) {
      context.boardSystem.spawnItem("item.water");
    }

    // The starter section is now full, and the locked rows below must not
    // absorb the overflow.
    expect(() => context.boardSystem.spawnItem("item.water")).toThrow(/Board is full/);
  });

  it("unlocks the next section once its gate and coins are in place", () => {
    const context = freshContext(new InMemoryStorage());
    const section = context.boardSections.requireById("board.power_console");

    expect(context.boardExpansionSystem.canUnlock(section.id)).toBe(false);

    context.economySystem.grant("coins", 1000);
    grantGate(context);

    expect(context.boardExpansionSystem.canUnlock(section.id)).toBe(true);
    const before = context.economySystem.getBalance("coins");
    context.boardExpansionSystem.unlockSection(section.id);

    expect(context.economySystem.getBalance("coins")).toBe(before - section.unlockCost);
    for (const cell of section.cells) {
      expect(context.state.board.getCell(cell.x, cell.y).state).toBe("EMPTY");
    }
  });

  it("persists unlocked cells across a reload", () => {
    const storage = new InMemoryStorage();
    const context = freshContext(storage);
    const section = context.boardSections.requireById("board.power_console");

    context.economySystem.grant("coins", 1000);
    grantGate(context);
    context.boardExpansionSystem.unlockSection(section.id);
    context.save();

    const reloaded = freshContext(storage);
    expect(reloaded.boardExpansionSystem.isUnlocked(section.id)).toBe(true);
    expect(reloaded.boardExpansionSystem.unlockedCellCount()).toBe(
      context.boardExpansionSystem.unlockedCellCount(),
    );
  });

  it("reports the unlock to analytics as canon §48's content_unlocked", () => {
    const tracked: AnalyticsEvent[] = [];
    const context = new GameContext({
      storage: new InMemoryStorage(),
      clock: new FixedClock(0),
      analytics: { track: (event) => tracked.push(event) },
    });
    context.start();

    context.economySystem.grant("coins", 1000);
    grantGate(context);
    tracked.length = 0;
    context.boardExpansionSystem.unlockSection("board.power_console");

    expect(tracked).toContainEqual({
      name: "content_unlocked",
      contentId: "board.power_console",
    });
  });
});
