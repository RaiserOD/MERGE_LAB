import { beforeEach, describe, expect, it } from "vitest";
import type { QuestDefinition } from "@domain/quests/QuestDefinition";
import { QuestRegistry } from "@domain/quests/QuestRegistry";
import type { CurrencySave, ProgressionSave, QuestSave } from "@domain/save/SaveDataV1";
import { EconomySystem } from "@systems/EconomySystem";
import { QuestSystem } from "@systems/QuestSystem";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { makeProgressionSave } from "../fixtures/testProgression";

function quest(overrides: Partial<QuestDefinition>): QuestDefinition {
  return {
    id: "quest.x",
    title: "X",
    requirement: { type: "MERGE_COUNT", target: 3 },
    coinReward: 10,
    gemReward: 0,
    researchReward: 0,
    ...overrides,
  };
}

describe("QuestSystem.reconcile", () => {
  let saves: QuestSave[];
  let currencies: CurrencySave;
  let bus: EventBus<DomainEvent>;
  let progression: ProgressionSave;

  beforeEach(() => {
    saves = [];
    currencies = { coins: 0, gems: 0, researchPoints: 0, energy: 10, maxEnergy: 10 };
    bus = new EventBus<DomainEvent>();
    progression = makeProgressionSave();
  });

  function systemFor(quests: QuestDefinition[]): QuestSystem {
    return new QuestSystem(
      saves,
      new QuestRegistry(quests),
      new EconomySystem(currencies, bus),
      bus,
    );
  }

  it("completes an UPGRADE_LAB quest the player already satisfied", () => {
    progression.labStage = 3;
    const system = systemFor([
      quest({ id: "quest.lab", requirement: { type: "UPGRADE_LAB", labStage: 2 } }),
    ]);

    expect(system.reconcile(progression)).toEqual(["quest.lab"]);
    expect(system.isCompleted("quest.lab")).toBe(true);
    expect(currencies.coins).toBe(10);
  });

  it("leaves an UPGRADE_LAB quest the player has not reached", () => {
    progression.labStage = 1;
    const system = systemFor([
      quest({ id: "quest.lab", requirement: { type: "UPGRADE_LAB", labStage: 4 } }),
    ]);

    expect(system.reconcile(progression)).toEqual([]);
    expect(currencies.coins).toBe(0);
  });

  it("completes a DISCOVER_ITEM quest for an item already discovered", () => {
    progression.discoveredItemIds = ["item.water", "item.steam"];
    const system = systemFor([
      quest({
        id: "quest.steam",
        requirement: { type: "DISCOVER_ITEM", target: 1, itemId: "item.steam" },
      }),
    ]);

    expect(system.reconcile(progression)).toEqual(["quest.steam"]);
  });

  it("counts discoveries when the quest names no particular item", () => {
    progression.discoveredItemIds = ["item.water", "item.steam"];
    const system = systemFor([
      quest({ id: "quest.any_two", requirement: { type: "DISCOVER_ITEM", target: 2 } }),
      quest({ id: "quest.any_five", requirement: { type: "DISCOVER_ITEM", target: 5 } }),
    ]);

    expect(system.reconcile(progression)).toEqual(["quest.any_two"]);
  });

  it("never credits a counting requirement — no lifetime counter is persisted", () => {
    progression.labStage = 5;
    progression.discoveredItemIds = ["item.water", "item.steam"];
    const system = systemFor([
      quest({ id: "quest.merges", requirement: { type: "MERGE_COUNT", target: 1 } }),
      quest({ id: "quest.coins", requirement: { type: "EARN_COINS", target: 1 } }),
      quest({ id: "quest.energy", requirement: { type: "SPEND_ENERGY", target: 1 } }),
      quest({ id: "quest.gen", requirement: { type: "USE_GENERATOR", target: 1 } }),
      quest({ id: "quest.order", requirement: { type: "COMPLETE_ORDER", target: 1 } }),
    ]);

    expect(system.reconcile(progression)).toEqual([]);
    expect(currencies.coins).toBe(0);
  });

  it("skips a quest the player has no access to", () => {
    progression.labStage = 3;
    const gated = quest({ id: "quest.gated", requirement: { type: "UPGRADE_LAB", labStage: 2 } });
    const system = systemFor([gated]);

    // The rule: progress made before a quest was offered must not pay out.
    expect(system.reconcile(progression, () => false)).toEqual([]);
    expect(system.isCompleted("quest.gated")).toBe(false);
    expect(currencies.coins).toBe(0);
  });

  it("pays out exactly once across repeated reconciles", () => {
    progression.labStage = 2;
    const system = systemFor([
      quest({ id: "quest.lab", requirement: { type: "UPGRADE_LAB", labStage: 2 } }),
    ]);

    system.reconcile(progression);
    system.reconcile(progression);
    system.reconcile(progression);

    expect(currencies.coins).toBe(10);
  });

  it("emits QUEST_COMPLETED so observers see it like any other completion", () => {
    progression.labStage = 2;
    const seen: string[] = [];
    bus.on("QUEST_COMPLETED", (event) => seen.push(event.questId));
    const system = systemFor([
      quest({ id: "quest.lab", requirement: { type: "UPGRADE_LAB", labStage: 2 } }),
    ]);

    system.reconcile(progression);

    expect(seen).toEqual(["quest.lab"]);
  });
});
