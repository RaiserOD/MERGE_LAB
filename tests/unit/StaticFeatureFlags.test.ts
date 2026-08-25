import { describe, expect, it } from "vitest";
import { StaticFeatureFlags } from "@infrastructure/flags/StaticFeatureFlags";

describe("StaticFeatureFlags", () => {
  it("defaults every flag to off", () => {
    const flags = new StaticFeatureFlags();
    expect(flags.isEnabled("rewardedAds")).toBe(false);
    expect(flags.isEnabled("iap")).toBe(false);
  });

  it("honors explicit overrides", () => {
    const flags = new StaticFeatureFlags({ rewardedAds: true });
    expect(flags.isEnabled("rewardedAds")).toBe(true);
    expect(flags.isEnabled("iap")).toBe(false);
  });
});
