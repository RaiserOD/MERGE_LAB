import { describe, expect, it } from "vitest";
import { simulate } from "../../tools/economy-simulator/simulate";

/**
 * The simulator's failure mode is silent: a broken run still prints
 * plausible-looking numbers, and those numbers are meant to inform balance
 * decisions. These guard the properties that make its output trustworthy —
 * determinism, internal consistency, and that it is actually driving the
 * real systems rather than idling.
 */
describe("economy simulator", () => {
  it("is deterministic — the same options give the same report", () => {
    const options = { minutes: 30, tickSeconds: 30 };

    const first = simulate(options);
    const second = simulate(options);

    expect(second).toEqual(first);
  });

  it("earns coins by actually merging and delivering", () => {
    const report = simulate({ minutes: 30, tickSeconds: 30 });

    expect(report.generatorUses).toBeGreaterThan(0);
    expect(report.merges).toBeGreaterThan(0);
    expect(report.coinsEarned).toBeGreaterThan(0);
    expect(Object.values(report.ordersCompleted).reduce((sum, n) => sum + n, 0)).toBeGreaterThan(0);
  });

  it("spends only what the lab stages it reached actually cost", () => {
    const report = simulate({ minutes: 30, tickSeconds: 30 });

    const stageCosts = report.stages.reduce((sum, stage) => sum + stage.cost, 0);
    expect(report.coinsSpent).toBe(stageCosts);
    expect(report.coinsSpent).toBeLessThanOrEqual(report.coinsEarned);
  });

  it("reaches lab stages in order, without skipping one", () => {
    const report = simulate({ minutes: 240, tickSeconds: 30 });

    const reached = report.stages.map((stage) => stage.stage);
    expect(reached).toEqual(reached.map((_, index) => index + 2));
    expect(report.finalStage).toBe(reached.at(-1) ?? 1);
  });

  // Added with merge XP (ADR-0009): the simulator could not previously show
  // the effect of an XP change at all, so it could not verify one either.
  it("reports player level and XP earned along the way", () => {
    const report = simulate({ minutes: 240, tickSeconds: 30 });

    expect(report.totalXp).toBeGreaterThan(0);
    expect(report.finalPlayerLevel).toBeGreaterThan(1);
    expect(report.levelUps.length).toBeGreaterThan(0);

    // Level-ups are recorded in order, and the last one names the final level.
    const levels = report.levelUps.map((levelUp) => levelUp.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(report.levelUps.at(-1)?.level).toBe(report.finalPlayerLevel);
  });

  it("earns more XP than orders alone would pay, because merges award it too", () => {
    const report = simulate({ minutes: 240, tickSeconds: 30 });

    // order.first_sample pays 5 XP; anything above that came from merges.
    const orderXp = (report.ordersCompleted["order.first_sample"] ?? 0) * 5;
    expect(report.totalXp).toBeGreaterThan(orderXp);
  });

  it("reports the same economics regardless of tick size", () => {
    const coarse = simulate({ minutes: 120, tickSeconds: 60 });
    const fine = simulate({ minutes: 120, tickSeconds: 10 });

    // Tick size changes how often the loop samples, so blocked-reason
    // counts are tick-relative by construction. The economy must not be.
    expect(fine.coinsEarned).toBe(coarse.coinsEarned);
    expect(fine.generatorUses).toBe(coarse.generatorUses);
    expect(fine.merges).toBe(coarse.merges);
  });

  it("never lets the greedy player spend energy it does not have", () => {
    const report = simulate({ minutes: 120, tickSeconds: 30 });

    // 2 energy per generator use, 100 starting energy, 1 per minute after.
    const energyAvailable = 100 + report.simulatedMinutes;
    expect(report.generatorUses * 2).toBeLessThanOrEqual(energyAvailable);
  });
});
