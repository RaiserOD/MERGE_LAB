/**
 * The fixed analytics vocabulary from A24. Payloads carry only gameplay
 * identifiers (item/generator/order/quest/chapter ids) — never anything
 * that could identify a person, per A24's "no sensitive personal data".
 *
 * rewarded_ad_started/completed and iap_started/completed have no producer
 * yet — nothing in the codebase calls track() with them until the ads and
 * billing adapters (ML-032/033) exist. They're declared now because A24
 * fixes the whole vocabulary as one contract, not because anything emits
 * them today.
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
