import type { ItemDefinition } from "@domain/items/ItemDefinition";

export const waterItem: ItemDefinition = {
  id: "item.water",
  mergeGroup: "chemistry.water",
  level: 1,
  displayName: "Water",
  rarity: "common",
  sellValue: 1,
  xpValue: 1,
  spriteKey: "item_water",
  resultItemId: "item.steam",
  sourceGeneratorIds: ["gen.water_tap"],
  tags: ["chemistry"],
};

export const steamItem: ItemDefinition = {
  id: "item.steam",
  mergeGroup: "chemistry.water",
  level: 2,
  displayName: "Steam",
  rarity: "common",
  sellValue: 3,
  xpValue: 2,
  spriteKey: "item_steam",
  sourceGeneratorIds: [],
  tags: ["chemistry"],
  maxLevel: true,
};

export const dirtItem: ItemDefinition = {
  id: "item.dirt",
  mergeGroup: "biology.dirt",
  level: 1,
  displayName: "Dirt",
  rarity: "common",
  sellValue: 1,
  xpValue: 1,
  spriteKey: "item_dirt",
  sourceGeneratorIds: [],
  tags: ["biology"],
  maxLevel: true,
};

export const testItems: ItemDefinition[] = [waterItem, steamItem, dirtItem];
