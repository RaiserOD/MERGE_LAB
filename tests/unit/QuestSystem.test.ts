import { beforeEach, describe, expect, it } from "vitest";
import { QuestRegistry } from "@domain/quests/QuestRegistry";
import type { CurrencySave, QuestSave } from "@domain/save/SaveDataV1";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { EconomySystem } from "@systems/EconomySystem";
import { QuestSystem } from "@systems/QuestSystem";
import { chainedQuest, mergeQuest, testQuests } from "../fixtures/testQuests";

const somePosition = { x: 0, y: 0 };

describe("QuestSystem", () => {
  let questSaves: QuestSave[];
  let currencies: CurrencySave;
  let eventBus: EventBus<DomainEvent>;
  let completed: DomainEvent[];
  let questSystem: QuestSystem;
  let stop: () => void;

  beforeEach(() => {
    questSaves = [];
    currencies = { coins: 0, gems: 0, researchPoints: 0, energy: 100, maxEnergy: 100 };
    eventBus = new EventBus<DomainEvent>();
    completed = [];
    eventBus.on("QUEST_COMPLETED", (event) => completed.push(event));

    questSystem = new QuestSystem(
      questSaves,
      new QuestRegistry(testQuests),
      new EconomySystem(currencies, eventBus),
      eventBus,
    );
    stop = questSystem.start();
  });

  function emitMerge(): void {
    eventBus.emit({
      type: "ITEM_MERGED",
      consumedItemId: "item.water",
      resultItemId: "item.steam",
      from: somePosition,
      to: { x: 1, y: 0 },
    });
  }

  it("advances MERGE_COUNT quests and completes at the target", () => {
    emitMerge();
    emitMerge();

    expect(questSystem.getState("quest.merge_three").progress).toBe(2);
    expect(questSystem.isCompleted("quest.merge_three")).toBe(false);

    emitMerge();

    expect(questSystem.isCompleted("quest.merge_three")).toBe(true);
    expect(currencies.coins).toBe(15);
  });

  it("stops accruing and pays out only once after completion", () => {
    emitMerge();
    emitMerge();
    emitMerge();
    emitMerge();
    emitMerge();

    expect(questSystem.getState("quest.merge_three").progress).toBe(3);
    expect(currencies.coins).toBe(15);
    expect(
      completed.filter((event) => "questId" in event && event.questId === "quest.merge_three"),
    ).toHaveLength(1);
  });

  it("advances DISCOVER_ITEM only for the item it names", () => {
    eventBus.emit({ type: "ITEM_DISCOVERED", itemId: "item.dirt" });
    expect(questSystem.isCompleted("quest.discover_steam")).toBe(false);

    eventBus.emit({ type: "ITEM_DISCOVERED", itemId: "item.steam" });
    expect(questSystem.isCompleted("quest.discover_steam")).toBe(true);
    expect(currencies.researchPoints).toBe(1);
  });

  it("advances USE_GENERATOR only for the generator it names", () => {
    eventBus.emit({
      type: "GENERATOR_USED",
      generatorId: "gen.other",
      outputItemId: "item.dirt",
      position: somePosition,
      chargesRemaining: 1,
    });
    expect(questSystem.getState("quest.tap_the_water").progress).toBe(0);

    for (let i = 0; i < 2; i++) {
      eventBus.emit({
        type: "GENERATOR_USED",
        generatorId: "gen.water_tap",
        outputItemId: "item.water",
        position: somePosition,
        chargesRemaining: 1,
      });
    }
    expect(questSystem.isCompleted("quest.tap_the_water")).toBe(true);
  });

  it("advances an unfiltered COMPLETE_ORDER quest for any order", () => {
    eventBus.emit({
      type: "ORDER_COMPLETED",
      orderId: "order.anything",
      coinReward: 0,
      researchReward: 0,
      xpReward: 0,
    });

    expect(questSystem.isCompleted("quest.any_order")).toBe(true);
  });

  it("counts coins earned but not coins spent towards EARN_COINS", () => {
    eventBus.emit({ type: "CURRENCY_CHANGED", currency: "coins", delta: 20, newBalance: 20 });
    expect(questSystem.getState("quest.earn_coins").progress).toBe(20);

    eventBus.emit({ type: "CURRENCY_CHANGED", currency: "coins", delta: -15, newBalance: 5 });
    expect(questSystem.getState("quest.earn_coins").progress).toBe(20);

    eventBus.emit({ type: "CURRENCY_CHANGED", currency: "coins", delta: 10, newBalance: 15 });
    expect(questSystem.isCompleted("quest.earn_coins")).toBe(true);
    expect(currencies.gems).toBe(1);
  });

  it("ignores currency changes for other currencies", () => {
    eventBus.emit({ type: "CURRENCY_CHANGED", currency: "gems", delta: 50, newBalance: 50 });

    expect(questSystem.getState("quest.earn_coins").progress).toBe(0);
  });

  it("completes UPGRADE_LAB on reaching the stage it names", () => {
    eventBus.emit({ type: "LAB_UPGRADED", newStage: 2, title: "Chemistry Lab", coinCost: 150 });

    expect(questSystem.isCompleted("quest.upgrade_lab")).toBe(true);
    expect(currencies.researchPoints).toBe(2);
  });

  // UPGRADE_LAB is a threshold (canon §4), not a count of upgrades: an
  // earlier stage leaves it unsatisfied however many upgrades happened.
  it("leaves UPGRADE_LAB unsatisfied below the stage it names", () => {
    eventBus.emit({ type: "LAB_UPGRADED", newStage: 1, title: "Basement Lab", coinCost: 0 });

    expect(questSystem.isCompleted("quest.upgrade_lab")).toBe(false);
  });

  it("completes UPGRADE_LAB when the stage is overshot in one jump", () => {
    eventBus.emit({ type: "LAB_UPGRADED", newStage: 4, title: "Robotics Lab", coinCost: 1200 });

    expect(questSystem.isCompleted("quest.upgrade_lab")).toBe(true);
  });

  it("accrues SPEND_ENERGY by the amount spent", () => {
    eventBus.emit({ type: "ENERGY_SPENT", amount: 4, remaining: 96 });
    expect(questSystem.getState("quest.spend_energy").progress).toBe(4);

    eventBus.emit({ type: "ENERGY_SPENT", amount: 8, remaining: 88 });
    expect(questSystem.isCompleted("quest.spend_energy")).toBe(true);
    expect(questSystem.getState("quest.spend_energy").progress).toBe(10);
  });

  it("persists quest state into the shared QuestSave array", () => {
    emitMerge();

    expect(questSaves).toContainEqual({
      questId: "quest.merge_three",
      progress: 1,
      completed: false,
    });
  });

  it("completes a COMPLETE_QUEST requirement when the quest it names finishes", () => {
    stop();
    const chainSaves: QuestSave[] = [];
    const chainSystem = new QuestSystem(
      chainSaves,
      new QuestRegistry([mergeQuest, chainedQuest]),
      new EconomySystem(currencies, eventBus),
      eventBus,
    );
    const chainStop = chainSystem.start();

    emitMerge();
    emitMerge();
    emitMerge();

    expect(chainSystem.isCompleted("quest.merge_three")).toBe(true);
    expect(chainSystem.isCompleted("quest.after_merges")).toBe(true);
    chainStop();
  });

  it("stops listening once unsubscribed", () => {
    stop();
    emitMerge();

    expect(questSystem.getState("quest.merge_three").progress).toBe(0);
  });
});
