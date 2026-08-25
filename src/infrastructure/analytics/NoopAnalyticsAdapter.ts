import type { AnalyticsAdapter } from "@infrastructure/analytics/AnalyticsAdapter";
import type { AnalyticsEvent } from "@infrastructure/analytics/AnalyticsEvent";

/**
 * Default adapter: discards every event. No analytics vendor has been
 * chosen yet, and picking one is a product decision (B9), not something
 * to default into silently — this keeps the game fully functional with
 * zero analytics footprint until that decision is made.
 */
export class NoopAnalyticsAdapter implements AnalyticsAdapter {
  track(_event: AnalyticsEvent): void {
    // Intentionally empty.
  }
}
