/**
 * The analytics vocabulary canon §48 requires. Payloads carry only gameplay
 * identifiers (item/generator/order/quest/chapter ids) — never anything
 * that could identify a person, per the "no sensitive personal data" rule.
 *
 * rewarded_ad_started/completed and iap_started/completed are produced by
 * MonetizationService, gated behind their feature flags — both flags
 * default off until a vendor is chosen, so neither fires in practice
 * yet, but the wiring is real.
 */
export type AnalyticsEvent =
  | { name: "game_started" }
  | { name: "session_started" }
  | { name: "session_ended" }
  | { name: "tutorial_started" }
  | { name: "tutorial_completed" }
  | { name: "merge_performed"; resultItemId: string }
  | { name: "item_discovered"; itemId: string }
  | { name: "generator_used"; generatorId: string; outputItemId: string }
  | { name: "order_completed"; orderId: string }
  | { name: "quest_completed"; questId: string }
  | { name: "chapter_unlocked"; chapterId: string }
  // Canon §48 requires content_unlocked. Board sections are its first
  // producer; the campaign layer will add items, generators and research.
  | { name: "content_unlocked"; contentId: string }
  | { name: "lab_upgraded"; newStage: number }
  | { name: "energy_empty" }
  | { name: "rewarded_ad_started" }
  | { name: "rewarded_ad_completed" }
  | { name: "iap_started" }
  | { name: "iap_completed" };

export type AnalyticsEventName = AnalyticsEvent["name"];
