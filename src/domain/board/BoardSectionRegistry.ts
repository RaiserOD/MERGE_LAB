import type {
  BoardSectionCell,
  BoardSectionDefinition,
} from "@domain/board/BoardSectionDefinition";
import { cellKey } from "@domain/board/BoardCell";

/** The starter section's number. Canon §39 calls it the "starter area". */
export const STARTER_SECTION_NUMBER = 1;

export class BoardSectionRegistry {
  private readonly byId: Map<string, BoardSectionDefinition>;
  private readonly sectionIdByCell: Map<string, string>;

  constructor(definitions: readonly BoardSectionDefinition[]) {
    this.byId = new Map();
    this.sectionIdByCell = new Map();

    for (const definition of definitions) {
      if (this.byId.has(definition.id)) {
        throw new Error(`Duplicate board section id in content: ${definition.id}`);
      }
      this.byId.set(definition.id, definition);

      for (const cell of definition.cells) {
        const key = cellKey(cell.x, cell.y);
        const owner = this.sectionIdByCell.get(key);
        if (owner !== undefined) {
          throw new Error(
            `Board cell (${String(cell.x)},${String(cell.y)}) is claimed by both ${owner} and ${definition.id}`,
          );
        }
        this.sectionIdByCell.set(key, definition.id);
      }
    }
  }

  getById(id: string): BoardSectionDefinition | undefined {
    return this.byId.get(id);
  }

  requireById(id: string): BoardSectionDefinition {
    const section = this.byId.get(id);
    if (!section) {
      throw new Error(`Unknown board section id: ${id}`);
    }
    return section;
  }

  /** Sections in unlock order. */
  all(): readonly BoardSectionDefinition[] {
    return [...this.byId.values()].sort((a, b) => a.sectionNumber - b.sectionNumber);
  }

  sectionIdForCell(x: number, y: number): string | undefined {
    return this.sectionIdByCell.get(cellKey(x, y));
  }

  /**
   * Cells that a brand-new board starts LOCKED: everything outside the
   * starter section. Derived from content rather than stored, so adding a
   * section changes the starting board without a save-schema change.
   */
  initiallyLockedCells(): readonly BoardSectionCell[] {
    return this.all()
      .filter((section) => section.sectionNumber !== STARTER_SECTION_NUMBER)
      .flatMap((section) => section.cells);
  }
}
