/**
 * Central runtime configuration. Nothing here may read secrets — this file
 * ships in the client bundle and is fully visible to players.
 */
export interface RuntimeConfig {
  readonly boardCols: number;
  readonly boardRows: number;
  readonly maxEnergy: number;
}

export const runtimeConfig: RuntimeConfig = {
  boardCols: 7,
  boardRows: 9,
  maxEnergy: 100,
};
