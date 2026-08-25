import type { AnalyticsAdapter } from "@infrastructure/analytics/AnalyticsAdapter";
import type { AnalyticsEvent } from "@infrastructure/analytics/AnalyticsEvent";

/** Dev-only adapter that prints events to the console. Not wired by default — pass it explicitly. */
export class ConsoleAnalyticsAdapter implements AnalyticsAdapter {
  track(event: AnalyticsEvent): void {
    const { name, ...payload } = event;
    console.debug(`[analytics] ${name}`, payload);
  }
}
