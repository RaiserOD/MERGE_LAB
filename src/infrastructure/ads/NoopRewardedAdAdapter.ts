import type { RewardedAdAdapter, RewardedAdResult } from "@infrastructure/ads/RewardedAdAdapter";

/**
 * Default adapter: no ad SDK is wired yet, so every placement reports as
 * not granted rather than pretending a reward was earned. Picking an ad
 * network is a vendor decision (B9), not something to default into.
 */
export class NoopRewardedAdAdapter implements RewardedAdAdapter {
  show(_placementId: string): Promise<RewardedAdResult> {
    return Promise.resolve({ granted: false });
  }
}
