import { afterEach, describe, expect, it, vi } from "vitest";
import { NoopAnalyticsAdapter } from "@infrastructure/analytics/NoopAnalyticsAdapter";
import { ConsoleAnalyticsAdapter } from "@infrastructure/analytics/ConsoleAnalyticsAdapter";

describe("NoopAnalyticsAdapter", () => {
  it("accepts any event without throwing or producing output", () => {
    const adapter = new NoopAnalyticsAdapter();
    expect(() => {
      adapter.track({ name: "game_started" });
    }).not.toThrow();
  });
});

describe("ConsoleAnalyticsAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the event name and payload to the console", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const adapter = new ConsoleAnalyticsAdapter();

    adapter.track({ name: "item_discovered", itemId: "item.steam" });

    expect(debugSpy).toHaveBeenCalledWith("[analytics] item_discovered", { itemId: "item.steam" });
  });
});
