import { describe, expect, it } from "vitest";
import type { QuestDefinition } from "@domain/quests/QuestDefinition";
import { validateQuests } from "../../tools/content-validator/index";

function quest(overrides: Partial<QuestDefinition> = {}): QuestDefinition {
  return {
    id: "quest.a",
    title: "A",
    requirement: { type: "MERGE_COUNT", target: 1 },
    coinReward: 0,
    gemReward: 0,
    researchReward: 0,
    ...overrides,
  };
}

function requiresQuest(id: string, questId: string): QuestDefinition {
  return quest({ id, requirement: { type: "COMPLETE_QUEST", target: 1, questId } });
}

const noContent = new Set<string>();

describe("content validator — quest requirement cycles", () => {
  it("accepts a chain that terminates", () => {
    const errors = validateQuests(
      [quest({ id: "quest.root" }), requiresQuest("quest.a", "quest.root")],
      noContent,
      noContent,
      noContent,
    );

    expect(errors).toEqual([]);
  });

  it("still rejects a quest requiring itself", () => {
    const errors = validateQuests(
      [requiresQuest("quest.a", "quest.a")],
      noContent,
      noContent,
      noContent,
    );

    expect(errors).toContain("quest.a: COMPLETE_QUEST cannot require itself");
  });

  it("rejects a two-quest cycle that the self-check misses", () => {
    const errors = validateQuests(
      [requiresQuest("quest.a", "quest.b"), requiresQuest("quest.b", "quest.a")],
      noContent,
      noContent,
      noContent,
    );

    expect(errors.some((error) => error.startsWith("Circular quest requirement:"))).toBe(true);
  });

  it("rejects a longer cycle", () => {
    const errors = validateQuests(
      [
        requiresQuest("quest.a", "quest.b"),
        requiresQuest("quest.b", "quest.c"),
        requiresQuest("quest.c", "quest.a"),
      ],
      noContent,
      noContent,
      noContent,
    );

    expect(errors.some((error) => error.startsWith("Circular quest requirement:"))).toBe(true);
  });
});
