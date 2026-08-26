import { Board } from "@domain/board/Board";
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
 * Runtime game state, shaped after SaveDataV1 (A23) but with `board` as a
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

  /** `now` must come from an injected Clock (A8) — never Date.now() here. */
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

  static createNew(): GameState {
    return new GameState(
      Board.createEmpty(runtimeConfig.boardCols, runtimeConfig.boardRows),
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
