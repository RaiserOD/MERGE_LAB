import Phaser from "phaser";
import { GameContext } from "@app/GameContext";
import { palette } from "@presentation/theme";

export const SCENE_KEYS = {
  boot: "BootScene",
  game: "GameScene",
} as const;

/**
 * Builds the game context and hands it to GameScene. On a first run the
 * board is empty, so a couple of starter items are spawned to make the
 * merge affordance visible immediately (A3: one draggable item in the
 * first 10 seconds).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(palette.background);

    let context: GameContext;
    try {
      context = new GameContext();
    } catch (error) {
      this.showFatalError(error);
      return;
    }

    context.start();
    this.seedFirstRun(context);

    this.scene.start(SCENE_KEYS.game, { context });
  }

  private seedFirstRun(context: GameContext): void {
    const boardHasItems = context.state.board.allCells().some((cell) => cell.state === "OCCUPIED");
    if (boardHasItems) {
      return;
    }

    const starterItem = context.items.all().find((item) => item.level === 1);
    if (!starterItem) {
      return;
    }

    context.boardSystem.spawnItem(starterItem.id);
    context.boardSystem.spawnItem(starterItem.id);
    context.save();
  }

  /** Content or save failures are fatal at boot — say so on screen instead of a blank canvas. */
  private showFatalError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to start Merge Lab", error);

    this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Failed to start:\n${message}`, {
        color: palette.text,
        fontSize: "16px",
        align: "center",
        wordWrap: { width: this.scale.width - 48 },
      })
      .setOrigin(0.5);
  }
}
