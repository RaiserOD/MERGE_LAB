import { Board } from "@domain/board/Board";
import type { BoardCell } from "@domain/board/BoardCell";
import type { BoardSectionCell } from "@domain/board/BoardSectionDefinition";
import type {
  CurrencySave,
  EventSave,
  GeneratorSave,
  PlayerSave,
  ProgressionSave,
  QuestSave,
  SaveDataV1,
} from "@domain/save/SaveDataV1";
import { runtimeConfig } from "@config/runtime";

/**
 * Runtime game state, shaped after SaveDataV1 but with `board` as a
 * live Board instance instead of a flat array. Fields not yet driven by an
 * implemented system (generators, quests, events) default to empty so the
 * full save round-trips validly even before those systems exist.
 */
export class GameState {
  constructor(
    public readonly board: Board,
    public player: PlayerSave,
    public currencies: CurrencySave,
    public generators: GeneratorSave[],
    public progression: ProgressionSave,
    public quests: QuestSave[],
    public events: EventSave[],
  ) {}

  /** `now` must come from an injected Clock — never Date.now() here. */
  toSaveData(now: number): SaveDataV1 {
    return {
      version: 1,
      player: this.player,
      board: this.board.toSave(),
      currencies: this.currencies,
      generators: this.generators,
      progression: this.progression,
      quests: this.quests,
      events: this.events,
      lastSavedAt: now,
    };
  }

  static fromSaveData(data: SaveDataV1): GameState {
    return new GameState(
      Board.fromSave(data.board),
      data.player,
      data.currencies,
      data.generators,
      data.progression,
      data.quests,
      data.events,
    );
  }

  /**
   * A brand-new game. `initiallyLockedCells` comes from the board-section
   * content (canon §39: the board opens progressively), so a fresh board
   * starts with only the starter area usable. Defaulting to none keeps
   * every existing caller — and every test that doesn't care — working.
   */
  static createNew(initiallyLockedCells: readonly BoardSectionCell[] = []): GameState {
    const lockedCells: BoardCell[] = initiallyLockedCells.map((cell) => ({
      x: cell.x,
      y: cell.y,
      state: "LOCKED",
    }));

    return new GameState(
      new Board(runtimeConfig.boardCols, runtimeConfig.boardRows, lockedCells),
      { level: 1, xp: 0 },
      {
        coins: 0,
        gems: 0,
        researchPoints: 0,
        energy: runtimeConfig.maxEnergy,
        maxEnergy: runtimeConfig.maxEnergy,
      },
      [],
      {
        labStage: 1,
        unlockedChapterIds: ["chapter.basement"],
        discoveredItemIds: [],
        seenDialogueIds: [],
        completedTutorialStepIds: [],
        completedLevelIds: [],
        unlockedContentIds: [],
        purchasedResearchNodeIds: [],
      },
      [],
      [],
    );
  }
}
