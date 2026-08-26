import { beforeEach, describe, expect, it } from "vitest";
import type { ProgressionSave } from "@domain/save/SaveDataV1";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { AnalyticsBridge } from "@application/services/AnalyticsBridge";
import type { AnalyticsEvent } from "@infrastructure/analytics/AnalyticsEvent";
import { makeProgressionSave } from "../fixtures/testProgression";

const somePosition = { x: 0, y: 0 };

function makeProgression(completedTutorialStepIds: string[] = []): ProgressionSave {
  return makeProgressionSave({ completedTutorialStepIds });
}

describe("AnalyticsBridge", () => {
  let eventBus: EventBus<DomainEvent>;
  let tracked: AnalyticsEvent[];
  let adapter: { track: (event: AnalyticsEvent) => void };

  beforeEach(() => {
    eventBus = new EventBus<DomainEvent>();
    tracked = [];
    adapter = { track: (event) => tracked.push(event) };
  });

  it("tracks game_started only on a first launch", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(true);
    expect(tracked).toContainEqual({ name: "game_started" });
  });

  it("does not track game_started for a returning player", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    expect(tracked).not.toContainEqual({ name: "game_started" });
  });

  it("always tracks session_started, first launch or not", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    expect(tracked).toContainEqual({ name: "session_started" });
  });

  it("tracks tutorial_started only when no tutorial progress exists yet", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    expect(tracked).toContainEqual({ name: "tutorial_started" });
  });

  it("does not re-track tutorial_started for a player already mid-tutorial", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression(["tutorial.first_merge"])).start(false);
    expect(tracked).not.toContainEqual({ name: "tutorial_started" });
  });

  it("translates ITEM_MERGED into merge_performed", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({
      type: "ITEM_MERGED",
      consumedItemId: "item.water",
      resultItemId: "item.steam",
      from: somePosition,
      to: { x: 1, y: 0 },
    });

    expect(tracked).toEqual([{ name: "merge_performed", resultItemId: "item.steam" }]);
  });

  it("translates ITEM_DISCOVERED into item_discovered", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "ITEM_DISCOVERED", itemId: "item.steam" });

    expect(tracked).toEqual([{ name: "item_discovered", itemId: "item.steam" }]);
  });

  it("translates GENERATOR_USED into generator_used", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({
      type: "GENERATOR_USED",
      generatorId: "gen.water_tap",
      outputItemId: "item.water",
      position: somePosition,
      chargesRemaining: 2,
    });

    expect(tracked).toEqual([
      { name: "generator_used", generatorId: "gen.water_tap", outputItemId: "item.water" },
    ]);
  });

  it("translates ORDER_COMPLETED into order_completed", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({
      type: "ORDER_COMPLETED",
      orderId: "order.first_sample",
      coinReward: 25,
      researchReward: 1,
      xpReward: 5,
    });

    expect(tracked).toEqual([{ name: "order_completed", orderId: "order.first_sample" }]);
  });

  it("translates QUEST_COMPLETED into quest_completed", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({
      type: "QUEST_COMPLETED",
      questId: "quest.merge_three",
      coinReward: 15,
      gemReward: 0,
      researchReward: 0,
    });

    expect(tracked).toEqual([{ name: "quest_completed", questId: "quest.merge_three" }]);
  });

  it("translates CHAPTER_UNLOCKED into chapter_unlocked", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "CHAPTER_UNLOCKED", chapterId: "chapter.chemistry" });

    expect(tracked).toEqual([{ name: "chapter_unlocked", chapterId: "chapter.chemistry" }]);
  });

  it("translates LAB_UPGRADED into lab_upgraded", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "LAB_UPGRADED", newStage: 2, title: "Chemistry Lab", coinCost: 25 });

    expect(tracked).toEqual([{ name: "lab_upgraded", newStage: 2 }]);
  });

  it("translates TUTORIAL_COMPLETED into tutorial_completed", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "TUTORIAL_COMPLETED" });

    expect(tracked).toEqual([{ name: "tutorial_completed" }]);
  });

  it("tracks energy_empty only when a spend drains energy to exactly zero", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "ENERGY_SPENT", amount: 4, remaining: 6 });
    expect(tracked).toHaveLength(0);

    eventBus.emit({ type: "ENERGY_SPENT", amount: 6, remaining: 0 });
    expect(tracked).toEqual([{ name: "energy_empty" }]);
  });

  it("translates REWARDED_AD_STARTED into rewarded_ad_started", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "REWARDED_AD_STARTED", placementId: "placement.double_coins" });

    expect(tracked).toEqual([{ name: "rewarded_ad_started" }]);
  });

  it("translates REWARDED_AD_COMPLETED into rewarded_ad_completed", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "REWARDED_AD_COMPLETED", placementId: "placement.double_coins" });

    expect(tracked).toEqual([{ name: "rewarded_ad_completed" }]);
  });

  it("translates IAP_STARTED into iap_started", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "IAP_STARTED", productId: "product.remove_ads" });

    expect(tracked).toEqual([{ name: "iap_started" }]);
  });

  it("translates IAP_COMPLETED into iap_completed", () => {
    new AnalyticsBridge(adapter, eventBus, makeProgression()).start(false);
    tracked.length = 0;

    eventBus.emit({ type: "IAP_COMPLETED", productId: "product.remove_ads" });

    expect(tracked).toEqual([{ name: "iap_completed" }]);
  });

  it("tracks session_ended on demand", () => {
    const bridge = new AnalyticsBridge(adapter, eventBus, makeProgression());
    bridge.start(false);
    tracked.length = 0;

    bridge.trackSessionEnded();

    expect(tracked).toEqual([{ name: "session_ended" }]);
  });

  it("stops translating events once unsubscribed", () => {
    const bridge = new AnalyticsBridge(adapter, eventBus, makeProgression());
    const stop = bridge.start(false);
    tracked.length = 0;

    stop();
    eventBus.emit({ type: "ITEM_DISCOVERED", itemId: "item.steam" });

    expect(tracked).toHaveLength(0);
  });
});
