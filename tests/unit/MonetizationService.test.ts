import { describe, expect, it } from "vitest";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { MonetizationService } from "@application/services/MonetizationService";
import { StaticFeatureFlags } from "@infrastructure/flags/StaticFeatureFlags";
import type { RewardedAdAdapter, RewardedAdResult } from "@infrastructure/ads/RewardedAdAdapter";
import type { BillingAdapter, PurchaseResult } from "@infrastructure/billing/BillingAdapter";

function fakeAds(result: RewardedAdResult): RewardedAdAdapter {
  return { show: () => Promise.resolve(result) };
}

function fakeBilling(result: PurchaseResult): BillingAdapter {
  return { purchase: () => Promise.resolve(result) };
}

describe("MonetizationService.requestRewardedAd", () => {
  it("returns unavailable and emits nothing when the flag is off", async () => {
    const eventBus = new EventBus<DomainEvent>();
    const emitted: DomainEvent[] = [];
    eventBus.on("REWARDED_AD_STARTED", (e) => emitted.push(e));
    const service = new MonetizationService(
      eventBus,
      new StaticFeatureFlags(),
      fakeAds({ granted: true }),
      fakeBilling({ success: true }),
    );

    const outcome = await service.requestRewardedAd("placement.double_coins");

    expect(outcome).toBe("unavailable");
    expect(emitted).toHaveLength(0);
  });

  it("emits started then completed and returns granted when the ad pays out", async () => {
    const eventBus = new EventBus<DomainEvent>();
    const emitted: DomainEvent[] = [];
    eventBus.on("REWARDED_AD_STARTED", (e) => emitted.push(e));
    eventBus.on("REWARDED_AD_COMPLETED", (e) => emitted.push(e));
    const service = new MonetizationService(
      eventBus,
      new StaticFeatureFlags({ rewardedAds: true }),
      fakeAds({ granted: true }),
      fakeBilling({ success: false }),
    );

    const outcome = await service.requestRewardedAd("placement.double_coins");

    expect(outcome).toBe("granted");
    expect(emitted).toEqual([
      { type: "REWARDED_AD_STARTED", placementId: "placement.double_coins" },
      { type: "REWARDED_AD_COMPLETED", placementId: "placement.double_coins" },
    ]);
  });

  it("emits only started and returns not_granted when the ad does not pay out", async () => {
    const eventBus = new EventBus<DomainEvent>();
    const emitted: DomainEvent[] = [];
    eventBus.on("REWARDED_AD_STARTED", (e) => emitted.push(e));
    eventBus.on("REWARDED_AD_COMPLETED", (e) => emitted.push(e));
    const service = new MonetizationService(
      eventBus,
      new StaticFeatureFlags({ rewardedAds: true }),
      fakeAds({ granted: false }),
      fakeBilling({ success: false }),
    );

    const outcome = await service.requestRewardedAd("placement.double_coins");

    expect(outcome).toBe("not_granted");
    expect(emitted).toEqual([
      { type: "REWARDED_AD_STARTED", placementId: "placement.double_coins" },
    ]);
  });
});

describe("MonetizationService.purchase", () => {
  it("returns unavailable and emits nothing when the flag is off", async () => {
    const eventBus = new EventBus<DomainEvent>();
    const emitted: DomainEvent[] = [];
    eventBus.on("IAP_STARTED", (e) => emitted.push(e));
    const service = new MonetizationService(
      eventBus,
      new StaticFeatureFlags(),
      fakeAds({ granted: false }),
      fakeBilling({ success: true }),
    );

    const outcome = await service.purchase("product.remove_ads");

    expect(outcome).toBe("unavailable");
    expect(emitted).toHaveLength(0);
  });

  it("emits started then completed and returns success when the purchase succeeds", async () => {
    const eventBus = new EventBus<DomainEvent>();
    const emitted: DomainEvent[] = [];
    eventBus.on("IAP_STARTED", (e) => emitted.push(e));
    eventBus.on("IAP_COMPLETED", (e) => emitted.push(e));
    const service = new MonetizationService(
      eventBus,
      new StaticFeatureFlags({ iap: true }),
      fakeAds({ granted: false }),
      fakeBilling({ success: true }),
    );

    const outcome = await service.purchase("product.remove_ads");

    expect(outcome).toBe("success");
    expect(emitted).toEqual([
      { type: "IAP_STARTED", productId: "product.remove_ads" },
      { type: "IAP_COMPLETED", productId: "product.remove_ads" },
    ]);
  });

  it("emits only started and returns failed when the purchase fails", async () => {
    const eventBus = new EventBus<DomainEvent>();
    const emitted: DomainEvent[] = [];
    eventBus.on("IAP_STARTED", (e) => emitted.push(e));
    eventBus.on("IAP_COMPLETED", (e) => emitted.push(e));
    const service = new MonetizationService(
      eventBus,
      new StaticFeatureFlags({ iap: true }),
      fakeAds({ granted: false }),
      fakeBilling({ success: false }),
    );

    const outcome = await service.purchase("product.remove_ads");

    expect(outcome).toBe("failed");
    expect(emitted).toEqual([{ type: "IAP_STARTED", productId: "product.remove_ads" }]);
  });
});
