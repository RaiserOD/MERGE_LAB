import { describe, expect, it } from "vitest";
import { GameContext } from "@app/GameContext";
import type { AnalyticsEvent } from "@infrastructure/analytics/AnalyticsEvent";
import { StaticFeatureFlags } from "@infrastructure/flags/StaticFeatureFlags";
import type { RewardedAdAdapter } from "@infrastructure/ads/RewardedAdAdapter";
import type { BillingAdapter } from "@infrastructure/billing/BillingAdapter";
import { InMemoryStorage } from "../fixtures/InMemoryStorage";
import { FixedClock } from "../fixtures/FixedClock";

/**
 * Builds a real GameContext with the flags on and fake-but-real ad/billing
 * adapters, to prove MonetizationService, the event bus and AnalyticsBridge
 * are wired together correctly end to end — not just unit-tested in
 * isolation from each other.
 */
describe("Monetization through a real session (integration)", () => {
  it("tracks rewarded_ad_started/completed when a placement pays out", async () => {
    const tracked: AnalyticsEvent[] = [];
    const ads: RewardedAdAdapter = { show: () => Promise.resolve({ granted: true }) };
    const billing: BillingAdapter = { purchase: () => Promise.resolve({ success: false }) };

    const context = new GameContext({
      storage: new InMemoryStorage(),
      clock: new FixedClock(0),
      analytics: { track: (event) => tracked.push(event) },
      featureFlags: new StaticFeatureFlags({ rewardedAds: true }),
      ads,
      billing,
    });
    context.start();
    tracked.length = 0;

    const outcome = await context.monetization.requestRewardedAd("placement.double_coins");

    expect(outcome).toBe("granted");
    expect(tracked).toEqual([{ name: "rewarded_ad_started" }, { name: "rewarded_ad_completed" }]);
  });

  it("tracks iap_started/completed when a purchase succeeds", async () => {
    const tracked: AnalyticsEvent[] = [];
    const ads: RewardedAdAdapter = { show: () => Promise.resolve({ granted: false }) };
    const billing: BillingAdapter = { purchase: () => Promise.resolve({ success: true }) };

    const context = new GameContext({
      storage: new InMemoryStorage(),
      clock: new FixedClock(0),
      analytics: { track: (event) => tracked.push(event) },
      featureFlags: new StaticFeatureFlags({ iap: true }),
      ads,
      billing,
    });
    context.start();
    tracked.length = 0;

    const outcome = await context.monetization.purchase("product.remove_ads");

    expect(outcome).toBe("success");
    expect(tracked).toEqual([{ name: "iap_started" }, { name: "iap_completed" }]);
  });

  it("stays unavailable and silent with the default (no-vendor) GameContext wiring", async () => {
    const tracked: AnalyticsEvent[] = [];
    const context = new GameContext({
      storage: new InMemoryStorage(),
      clock: new FixedClock(0),
      analytics: { track: (event) => tracked.push(event) },
    });
    context.start();
    tracked.length = 0;

    const adOutcome = await context.monetization.requestRewardedAd("placement.double_coins");
    const purchaseOutcome = await context.monetization.purchase("product.remove_ads");

    expect(adOutcome).toBe("unavailable");
    expect(purchaseOutcome).toBe("unavailable");
    expect(tracked).toHaveLength(0);
  });
});
