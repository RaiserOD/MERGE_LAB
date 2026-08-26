export interface RewardedAdResult {
  /** True only if the player watched the ad to completion and earned the reward. */
  readonly granted: boolean;
}

/**
 * The only interface gameplay/application code should need for rewarded
 * video — third-party ad SDKs load only from src/infrastructure/**.
 * `placementId` identifies which ad slot is being shown (content-owned,
 * like item/order ids) so a future vendor adapter can map it to its own
 * ad-unit configuration.
 */
export interface RewardedAdAdapter {
  show(placementId: string): Promise<RewardedAdResult>;
}
