import Phaser from "phaser";
import { runtimeConfig } from "@config/runtime";

// The only place gameplay code is allowed to touch Phaser.Types config —
// everything downstream of this consumes plain domain/system interfaces.
export function buildPhaserConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#101820",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [],
    render: {
      pixelArt: false,
      antialias: true,
    },
    disableContextMenu: true,
    banner: false,
  };
}

export const boardDimensions = {
  cols: runtimeConfig.boardCols,
  rows: runtimeConfig.boardRows,
};
