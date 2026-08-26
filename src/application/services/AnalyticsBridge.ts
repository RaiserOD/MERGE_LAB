import type { ProgressionSave } from "@domain/save/SaveDataV1";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { AnalyticsAdapter } from "@infrastructure/analytics/AnalyticsAdapter";

/**
 * Translates domain events into the fixed A24 analytics vocabulary. This is
 * the only place that calls `AnalyticsAdapter.track` — every gameplay
 * system stays exactly as unaware of analytics as it is of quests or the
 * tutorial — no direct analytics calls from domain/systems.
 */
export class AnalyticsBridge {
  constructor(
    private readonly adapter: AnalyticsAdapter,
    private readonly eventBus: EventBus<DomainEvent>,
    private readonly progression: ProgressionSave,
  ) {}

  /**
   * Call once per app launch, before gameplay starts. `isFirstLaunch`
   * distinguishes game_started (this browser's very first session) from
   * session_started (every session) — see SaveSystem.hasExistingSave.
   */
  start(isFirstLaunch: boolean): () => void {
    if (isFirstLaunch) {
      this.adapter.track({ name: "game_started" });
    }
    this.adapter.track({ name: "session_started" });
    if (this.progression.completedTutorialStepIds.length === 0) {
      this.adapter.track({ name: "tutorial_started" });
    }

    const unsubscribes = [
      this.eventBus.on("ITEM_MERGED", (event) => {
        this.adapter.track({ name: "merge_performed", resultItemId: event.resultItemId });
      }),
      this.eventBus.on("ITEM_DISCOVERED", (event) => {
        this.adapter.track({ name: "item_discovered", itemId: event.itemId });
      }),
      this.eventBus.on("GENERATOR_USED", (event) => {
        this.adapter.track({
          name: "generator_used",
          generatorId: event.generatorId,
          outputItemId: event.outputItemId,
        });
      }),
      this.eventBus.on("ORDER_COMPLETED", (event) => {
        this.adapter.track({ name: "order_completed", orderId: event.orderId });
      }),
      this.eventBus.on("QUEST_COMPLETED", (event) => {
        this.adapter.track({ name: "quest_completed", questId: event.questId });
      }),
      this.eventBus.on("CHAPTER_UNLOCKED", (event) => {
        this.adapter.track({ name: "chapter_unlocked", chapterId: event.chapterId });
      }),
      this.eventBus.on("LAB_UPGRADED", (event) => {
        this.adapter.track({ name: "lab_upgraded", newStage: event.newStage });
      }),
      this.eventBus.on("TUTORIAL_COMPLETED", () => {
        this.adapter.track({ name: "tutorial_completed" });
      }),
      this.eventBus.on("ENERGY_SPENT", (event) => {
        if (event.remaining === 0) {
          this.adapter.track({ name: "energy_empty" });
        }
      }),
      this.eventBus.on("REWARDED_AD_STARTED", () => {
        this.adapter.track({ name: "rewarded_ad_started" });
      }),
      this.eventBus.on("REWARDED_AD_COMPLETED", () => {
        this.adapter.track({ name: "rewarded_ad_completed" });
      }),
      this.eventBus.on("IAP_STARTED", () => {
        this.adapter.track({ name: "iap_started" });
      }),
      this.eventBus.on("IAP_COMPLETED", () => {
        this.adapter.track({ name: "iap_completed" });
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }

  trackSessionEnded(): void {
    this.adapter.track({ name: "session_ended" });
  }
}
