import type { AnalyticsEvent } from "@infrastructure/analytics/AnalyticsEvent";

/**
 * The only interface gameplay code should ever need for analytics (B4:
 * "no direct analytics calls from domain" extends to systems — everything
 * goes through AnalyticsBridge, which is the sole caller of `track`).
 * Swap the adapter to change where events go without touching a single
 * gameplay file.
 */
export interface AnalyticsAdapter {
  track(event: AnalyticsEvent): void;
}
