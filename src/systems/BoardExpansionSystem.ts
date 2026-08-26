import type { Board } from "@domain/board/Board";
import type { BoardSectionDefinition } from "@domain/board/BoardSectionDefinition";
import type { BoardSectionRegistry } from "@domain/board/BoardSectionRegistry";
import { evaluateUnlockConditions, type UnlockContext } from "@domain/progression/UnlockCondition";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { EconomySystem } from "@systems/EconomySystem";

export class BoardExpansionError extends Error {}

/**
 * Progressive board unlocking, per canon §39: the 7×9 grid never changes
 * size, but its cells become available a section at a time, gated by
 * conditions and paid for in coins.
 *
 * Cell state is the single source of truth for what is unlocked. It already
 * persists through `BoardCellSave.state`, and every other system already
 * treats a non-EMPTY cell as unusable (`Board.isEmpty`), so nothing else
 * needed teaching about locked cells.
 */
export class BoardExpansionSystem {
  constructor(
    private readonly board: Board,
    private readonly sections: BoardSectionRegistry,
    private readonly economySystem: EconomySystem,
    private readonly unlockContext: UnlockContext,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  isUnlocked(sectionId: string): boolean {
    const section = this.sections.requireById(sectionId);
    return section.cells.every((cell) => this.board.getCell(cell.x, cell.y).state !== "LOCKED");
  }

  /** Conditions only — affordability is reported separately so the UI can show a priced button. */
  conditionsMet(sectionId: string): boolean {
    const section = this.sections.requireById(sectionId);
    return evaluateUnlockConditions(section.unlockConditions, this.unlockContext);
  }

  canUnlock(sectionId: string): boolean {
    const section = this.sections.requireById(sectionId);
    return (
      !this.isUnlocked(sectionId) &&
      this.conditionsMet(sectionId) &&
      this.economySystem.canAfford("coins", section.unlockCost)
    );
  }

  /** The next locked section in order, whether or not it can be afforded yet. */
  nextLockedSection(): BoardSectionDefinition | undefined {
    return this.sections.all().find((section) => !this.isUnlocked(section.id));
  }

  /**
   * Unlocks a section: validate fully, then spend, then mutate, then emit.
   * Throws without touching coins or the board if anything fails.
   */
  unlockSection(sectionId: string): void {
    const section = this.sections.requireById(sectionId);

    if (this.isUnlocked(sectionId)) {
      throw new BoardExpansionError(`Board section ${sectionId} is already unlocked`);
    }
    if (!this.conditionsMet(sectionId)) {
      throw new BoardExpansionError(`Unlock conditions for ${sectionId} are not met`);
    }
    if (!this.economySystem.canAfford("coins", section.unlockCost)) {
      throw new BoardExpansionError(
        `Need ${String(section.unlockCost)} coins to unlock ${section.title}, only ${String(
          this.economySystem.getBalance("coins"),
        )} available`,
      );
    }

    this.economySystem.spend("coins", section.unlockCost);

    let unlockedCells = 0;
    for (const cell of section.cells) {
      const target = this.board.getCell(cell.x, cell.y);
      if (target.state === "LOCKED") {
        target.state = "EMPTY";
        unlockedCells += 1;
      }
    }

    this.eventBus.emit({
      type: "BOARD_SECTION_UNLOCKED",
      sectionId: section.id,
      title: section.title,
      coinCost: section.unlockCost,
      unlockedCells,
    });
  }

  /** Cells currently usable. Reported by the economy simulator as board pressure. */
  unlockedCellCount(): number {
    return this.board.allCells().filter((cell) => cell.state !== "LOCKED").length;
  }
}
