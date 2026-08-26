/**
 * Monetization features stay off until a vendor is chosen — a flag
 * lets that switch happen without a code change once one is, and lets it
 * be pulled back per-platform if a store review rejects it.
 */
export type FeatureFlagName = "rewardedAds" | "iap";

export interface FeatureFlags {
  isEnabled(flag: FeatureFlagName): boolean;
}
