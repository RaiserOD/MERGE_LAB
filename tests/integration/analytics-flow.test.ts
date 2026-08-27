import { describe, expect, it } from "vitest";
import { GameContext } from "@app/GameContext";
import type { AnalyticsEvent } from "@infrastructure/analytics/AnalyticsEvent";
import { InMemoryStorage } from "../fixtures/InMemoryStorage";
import { FixedClock } from "../fixtures/FixedClock";

/**
 * Builds a real GameContext — real content via ContentLoader, real systems,
 * only storage/clock/analytics swapped for test doubles — and drives the
 * actual tutorial loop through it, asserting the exact analytics sequence
 * canon §48 requires. This exercises the full composition root, not a mock of it.
 */
describe("Analytics through a real session (integration)", () => {
  it("tracks the full first-session sequence in order", () => {
    const tracked: AnalyticsEvent[] = [];
    const analytics = { track: (event: AnalyticsEvent) => tracked.push(event) };
    const storage = new InMemoryStorage();
    const clock = new FixedClock(0);

    const context = new GameContext({ storage, clock, analytics });
    context.start();

    expect(tracked).toEqual([
      { name: "game_started" },
      { name: "session_started" },
      { name: "tutorial_started" },
    ]);
    tracked.length = 0;

    const first = context.boardSystem.spawnItem("item.water");
    const second = context.boardSystem.spawnItem("item.water");
    const merge = context.mergeSystem.merge(first, second);
    expect(tracked).toContainEqual({ name: "merge_performed", resultItemId: merge.resultItemId });
    expect(tracked).toContainEqual({ name: "item_discovered", itemId: merge.resultItemId });
    tracked.length = 0;

    const generated = context.generatorSystem.use("gen.water_tap");
    expect(tracked).toContainEqual({
      name: "generator_used",
      generatorId: "gen.water_tap",
      outputItemId: generated.outputItemId,
    });
    tracked.length = 0;

    context.orderSystem.complete("order.first_sample");
    expect(tracked).toContainEqual({ name: "order_completed", orderId: "order.first_sample" });
    tracked.length = 0;

    context.progressionSystem.upgradeLab();
    expect(tracked).toContainEqual({ name: "lab_upgraded", newStage: 2 });
    expect(tracked).toContainEqual({ name: "tutorial_completed" });

    context.trackSessionEnded();
    expect(tracked.at(-1)).toEqual({ name: "session_ended" });
  });

  it("does not track game_started or tutorial_started for a returning player", () => {
    const storage = new InMemoryStorage();
    const clock = new FixedClock(0);

    // First session: write a save with the tutorial already finished.
    const bootstrap = new GameContext({ storage, clock, analytics: { track: () => undefined } });
    bootstrap.start();
    bootstrap.state.progression.completedTutorialStepIds.push(
      "tutorial.first_merge",
      "tutorial.use_generator",
      "tutorial.first_order",
      "tutorial.first_upgrade",
    );
    bootstrap.save();

    const tracked: AnalyticsEvent[] = [];
    const returning = new GameContext({
      storage,
      clock,
      analytics: { track: (event) => tracked.push(event) },
    });
    returning.start();

    expect(tracked).toEqual([{ name: "session_started" }]);
  });
});
