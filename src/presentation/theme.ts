import type { ItemRarity } from "@domain/items/ItemDefinition";

/**
 * Placeholder visual language. No art assets exist yet — polish comes
 * after the vertical slice, so items render as tinted tiles keyed by
 * rarity — readable silhouettes first, art later.
 */
export const palette = {
  background: 0x101820,
  boardBackground: 0x18222c,
  cellEmpty: 0x22303d,
  cellStroke: 0x2d3f4f,
  highlight: 0x3d8bfd,
  text: "#e8eef4",
  textMuted: "#94a7b8",
  highlightText: "#7fb0ff",
  panel: 0x16202a,
} as const;

export const rarityColors: Record<ItemRarity, number> = {
  common: 0x5c86a8,
  uncommon: 0x4f9d69,
  rare: 0x3d6fd8,
  epic: 0x8d5bc4,
  legendary: 0xc9902f,
};

// Re-exported so existing `@presentation/theme` imports keep working. The
// values live in an import-free module because the e2e test needs them and
// cannot resolve this file's aliased import — see layout.ts.
export { layout } from "@presentation/layout";
