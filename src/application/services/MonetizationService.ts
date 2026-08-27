import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { FeatureFlags } from "@infrastructure/flags/FeatureFlags";
import type { RewardedAdAdapter } from "@infrastructure/ads/RewardedAdAdapter";
import type { BillingAdapter } from "@infrastructure/billing/BillingAdapter";

export type RewardedAdOutcome = "granted" | "not_granted" | "unavailable";
export type PurchaseOutcome = "success" | "failed" | "unavailable";

/**
 * Gates ad/billing calls behind their feature flags and emits the domain
 * events AnalyticsBridge translates into the rewarded-ad/IAP vocabulary
 * — this is the only place that calls RewardedAdAdapter/BillingAdapter, the
 * same way AnalyticsBridge is the only caller of AnalyticsAdapter.
 *
 * What a granted ad or a completed purchase actually rewards the player
 * with is a product/economy decision with no catalog yet, so this
 * stops at reporting the outcome — callers decide what to grant once that
 * catalog exists.
 */
export class MonetizationService {
  constructor(
    private readonly eventBus: EventBus<DomainEvent>,
    private readonly flags: FeatureFlags,
    private readonly ads: RewardedAdAdapter,
    private readonly billing: BillingAdapter,
  ) {}

  async requestRewardedAd(placementId: string): Promise<RewardedAdOutcome> {
    if (!this.flags.isEnabled("rewardedAds")) {
      return "unavailable";
    }

    this.eventBus.emit({ type: "REWARDED_AD_STARTED", placementId });
    const result = await this.ads.show(placementId);

    if (!result.granted) {
      return "not_granted";
    }
    this.eventBus.emit({ type: "REWARDED_AD_COMPLETED", placementId });
    return "granted";
  }

  async purchase(productId: string): Promise<PurchaseOutcome> {
    if (!this.flags.isEnabled("iap")) {
      return "unavailable";
    }

    this.eventBus.emit({ type: "IAP_STARTED", productId });
    const result = await this.billing.purchase(productId);

    if (!result.success) {
      return "failed";
    }
    this.eventBus.emit({ type: "IAP_COMPLETED", productId });
    return "success";
  }
}
