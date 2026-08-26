import type { QuestDefinition } from "@domain/quests/QuestDefinition";

export const mergeQuest: QuestDefinition = {
  id: "quest.merge_three",
  title: "Combine three pairs",
  requirement: { type: "MERGE_COUNT", target: 3 },
  coinReward: 15,
  gemReward: 0,
  researchReward: 0,
};

export const discoverSteamQuest: QuestDefinition = {
  id: "quest.discover_steam",
  title: "Produce your first Steam",
  requirement: { type: "DISCOVER_ITEM", target: 1, itemId: "item.steam" },
  coinReward: 20,
  gemReward: 0,
  researchReward: 1,
};

export const useWaterTapQuest: QuestDefinition = {
  id: "quest.tap_the_water",
  title: "Use the water tap twice",
  requirement: { type: "USE_GENERATOR", target: 2, generatorId: "gen.water_tap" },
  coinReward: 10,
  gemReward: 0,
  researchReward: 0,
};

export const anyOrderQuest: QuestDefinition = {
  id: "quest.any_order",
  title: "Fulfil an order",
  requirement: { type: "COMPLETE_ORDER", target: 1 },
  coinReward: 5,
  gemReward: 0,
  researchReward: 0,
};

export const earnCoinsQuest: QuestDefinition = {
  id: "quest.earn_coins",
  title: "Earn 30 coins",
  requirement: { type: "EARN_COINS", target: 30 },
  coinReward: 0,
  gemReward: 1,
  researchReward: 0,
};

/** A threshold, not a count: reaching stage 2 satisfies it however it was reached. */
export const upgradeLabQuest: QuestDefinition = {
  id: "quest.upgrade_lab",
  title: "Restore the Chemistry Lab",
  requirement: { type: "UPGRADE_LAB", labStage: 2 },
  coinReward: 0,
  gemReward: 0,
  researchReward: 2,
};

export const spendEnergyQuest: QuestDefinition = {
  id: "quest.spend_energy",
  title: "Spend 10 energy",
  requirement: { type: "SPEND_ENERGY", target: 10 },
  coinReward: 8,
  gemReward: 0,
  researchReward: 0,
};

/**
 * Chains off another quest — the predicate canon needs for level
 * requirements. Deliberately NOT in `testQuests`: it pays out whenever
 * quest.merge_three completes, which would silently change the expected
 * balance in every test that uses the shared list.
 */
export const chainedQuest: QuestDefinition = {
  id: "quest.after_merges",
  title: "Follow up on the first merges",
  requirement: { type: "COMPLETE_QUEST", target: 1, questId: "quest.merge_three" },
  coinReward: 12,
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
