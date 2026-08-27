import type { Board } from "@domain/board/Board";
import type {
  BoardSectionCell,
  BoardSectionDefinition,
} from "@domain/board/BoardSectionDefinition";
import type { BoardSectionRegistry } from "@domain/board/BoardSectionRegistry";
import { evaluateUnlockConditions, type UnlockContext } from "@domain/progression/UnlockCondition";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { EconomySystem } from "@systems/EconomySystem";

export class BoardExpansionError extends Error {}

/**
 * Progressive board unlocking, per canon §39: the 7×9 grid never changes
 * size, but its cells become available a section at a time.
 *
 * Two separate things happen to a section, and keeping them apart is the
 * point of ADR-0012:
 *
 *   1. The campaign **offers** it — `unlockConditions` come true because the
 *      player progressed. This is a grant, not something the player does on
 *      purpose. Canon §9 grants the first board cells as a Level 3 *unlock*,
 *      which is why canon §4 needs no board-unlock requirement type.
 *   2. The player **buys** it, spending the content-defined coin cost.
 *
 * Cell state is the single source of truth for step 2. It already persists
 * through `BoardCellSave.state`, and every other system treats a non-EMPTY
 * cell as unusable (`Board.isEmpty`), so nothing else needed teaching about
 * locked cells. Step 1 is not persisted: conditions only ever become more
 * true (lab stage and player level rise, chapters unlock), so an offer once
 * made cannot be withdrawn and re-deriving it is exact.
 */
export class BoardExpansionSystem {
  /**
   * Sections already known to be offered. Seeded by `start()` from the
   * loaded save so a reload does not re-announce an offer the player has
   * already seen; after that it only grows, and each addition emits.
   */
  private readonly offered = new Set<string>();

  constructor(
    private readonly board: Board,
    private readonly sections: BoardSectionRegistry,
    private readonly economySystem: EconomySystem,
    private readonly unlockContext: UnlockContext,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  /**
   * Watches for sections the campaign has just offered.
   *
   * Subscribes to exactly the events that can move an unlock condition —
   * lab stage, player level, chapter unlocks. Returns an unsubscribe
   * function, like every other event-driven system here.
   */
  start(): () => void {
    for (const section of this.sections.all()) {
      if (this.conditionsMet(section.id)) {
        this.offered.add(section.id);
      }
    }

    const announce = (): void => {
      this.announceNewOffers();
    };

    const unsubscribes = [
      this.eventBus.on("LAB_UPGRADED", announce),
      this.eventBus.on("PLAYER_LEVELED", announce),
      this.eventBus.on("CHAPTER_UNLOCKED", announce),
    ];

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }

  /** Emits BOARD_SECTION_OFFERED for every section that just became available. */
  private announceNewOffers(): void {
    for (const section of this.sections.all()) {
      if (this.offered.has(section.id) || !this.conditionsMet(section.id)) {
        continue;
      }

      this.offered.add(section.id);
      if (this.isUnlocked(section.id)) {
        continue;
      }

      this.eventBus.emit({
        type: "BOARD_SECTION_OFFERED",
        sectionId: section.id,
        title: section.title,
        coinCost: section.unlockCost,
      });
    }
  }

  /**
   * Section cells that actually exist on this board.
   *
   * The content validator enforces that sections partition the configured
   * grid exactly, so this filter should never drop anything. It exists
   * because the alternative is throwing from `getCell` deep inside a UI
   * refresh: `ActionBar` calls `nextLockedSection()` on every redraw, so a
   * board/content mismatch would break rendering on every interaction
   * rather than failing once, loudly, at validation time.
   */
  private cellsOnBoard(section: BoardSectionDefinition): BoardSectionCell[] {
    return section.cells.filter((cell) => this.board.isValidCoordinate(cell.x, cell.y));
  }

  isUnlocked(sectionId: string): boolean {
    const section = this.sections.requireById(sectionId);
    const cells = this.cellsOnBoard(section);

    // A section with no cells on this board cannot be "not yet unlocked" —
    // treating it as unlocked keeps it out of the player's way.
    return cells.every((cell) => this.board.getCell(cell.x, cell.y).state !== "LOCKED");
  }

  /**
   * Whether the campaign has offered this section. Affordability is reported
   * separately, so the UI can show a priced button for an offer the player
   * cannot yet pay for.
   */
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
    for (const cell of this.cellsOnBoard(section)) {
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
