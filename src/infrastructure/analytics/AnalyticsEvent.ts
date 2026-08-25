/**
 * The fixed analytics vocabulary from A24. Payloads carry only gameplay
 * identifiers (item/generator/order/quest/chapter ids) — never anything
 * that could identify a person, per A24's "no sensitive personal data".
 *
 * rewarded_ad_started/completed and iap_started/completed are produced by
 * MonetizationService, gated behind their feature flags — both flags
 * default off until a vendor is chosen (B9), so neither fires in practice
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
  | { name: "lab_upgraded"; newStage: number }
  | { name: "energy_empty" }
  | { name: "rewarded_ad_started" }
  | { name: "rewarded_ad_completed" }
  | { name: "iap_started" }
  | { name: "iap_completed" };

export type AnalyticsEventName = AnalyticsEvent["name"];
