import Phaser from "phaser";
import { buildPhaserConfig } from "@app/AppConfig";

export class GameApp {
  private game: Phaser.Game | undefined;

  start(parent: HTMLElement): Phaser.Game {
    this.game = new Phaser.Game(buildPhaserConfig(parent));
    return this.game;
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = undefined;
  }
}
