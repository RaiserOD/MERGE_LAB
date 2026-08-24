import type { QuestDefinition } from "@domain/quests/QuestDefinition";

export const mergeQuest: QuestDefinition = {
  id: "quest.merge_three",
  type: "MERGE_COUNT",
  title: "Combine three pairs",
  target: 3,
  coinReward: 15,
  gemReward: 0,
  researchReward: 0,
};

export const discoverSteamQuest: QuestDefinition = {
  id: "quest.discover_steam",
  type: "DISCOVER_ITEM",
  title: "Produce your first Steam",
  itemId: "item.steam",
  target: 1,
  coinReward: 20,
  gemReward: 0,
  researchReward: 1,
};

export const useWaterTapQuest: QuestDefinition = {
  id: "quest.tap_the_water",
  type: "USE_GENERATOR",
  title: "Use the water tap twice",
  generatorId: "gen.water_tap",
  target: 2,
  coinReward: 10,
  gemReward: 0,
  researchReward: 0,
};

export const anyOrderQuest: QuestDefinition = {
  id: "quest.any_order",
  type: "COMPLETE_ORDER",
  title: "Fulfil an order",
  target: 1,
  coinReward: 5,
  gemReward: 0,
  researchReward: 0,
};

export const earnCoinsQuest: QuestDefinition = {
  id: "quest.earn_coins",
  type: "EARN_COINS",
  title: "Earn 30 coins",
  target: 30,
  coinReward: 0,
  gemReward: 1,
  researchReward: 0,
};

export const upgradeLabQuest: QuestDefinition = {
  id: "quest.upgrade_lab",
  type: "UPGRADE_LAB",
  title: "Upgrade the laboratory",
  target: 1,
  coinReward: 0,
  gemReward: 0,
  researchReward: 2,
};

export const spendEnergyQuest: QuestDefinition = {
  id: "quest.spend_energy",
  type: "SPEND_ENERGY",
  title: "Spend 10 energy",
  target: 10,
  coinReward: 8,
  gemReward: 0,
  researchReward: 0,
};

export const testQuests: QuestDefinition[] = [
  mergeQuest,
  discoverSteamQuest,
  useWaterTapQuest,
  anyOrderQuest,
  earnCoinsQuest,
  upgradeLabQuest,
  spendEnergyQuest,
];
