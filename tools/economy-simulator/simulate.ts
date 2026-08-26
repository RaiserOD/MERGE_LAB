/**
 * Economy simulator (B5). Drives a real GameContext headlessly to measure
 * what the current content actually implies: how long each lab stage takes,
 * what the steady-state coin rate is, and which resource is the binding
 * constraint.
 *
 * It builds the same systems the game builds — not a model of them. A
 * spreadsheet would drift from the code within a sprint; this cannot, which
 * is the whole point of the domain layer never importing Phaser.
 *
 * Loaded through Vite (see index.ts) because ContentLoader uses
 * import.meta.glob.
 */
import { GameContext } from "@app/GameContext";
import type { KeyValueStorage } from "@infrastructure/persistence/SaveSystem";
import type { Clock } from "@infrastructure/clock/Clock";
import type { BoardPosition } from "@systems/events/DomainEvent";
import { runtimeConfig } from "@config/runtime";

class SimulationClock implements Clock {
  constructor(private time = 0) {}

  now(): number {
    return this.time;
  }

  advance(deltaMs: number): void {
    this.time += deltaMs;
  }
}

class MemoryStorage implements KeyValueStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

/** Why the generator could not run on a given tick. Counting these is how the report names the bottleneck. */
type BlockedReason = "energy" | "charges" | "boardFull" | "none";

interface StageRecord {
  readonly stage: number;
  readonly title: string;
  readonly cost: number;
  readonly reachedAtMinute: number;
  readonly minutesInStage: number;
}

export interface SimulationReport {
  readonly tickSeconds: number;
  readonly simulatedMinutes: number;
  readonly stages: StageRecord[];
  readonly finalStage: number;
  readonly coinsEarned: number;
  readonly coinsSpent: number;
  readonly generatorUses: number;
  readonly merges: number;
  readonly ordersCompleted: Record<string, number>;
  readonly blocked: Record<BlockedReason, number>;
  readonly ticks: number;
  readonly peakOccupiedCells: number;
  readonly energyPerCoin: number;
}

export interface SimulationOptions {
  /** How long to simulate, in in-game minutes. */
  readonly minutes: number;
  /** Simulated seconds per tick. Smaller is finer-grained and slower. */
  readonly tickSeconds: number;
}

/**
 * A deliberately optimal player: merges everything mergeable, delivers the
 * most valuable completable order, generates whenever it can, and upgrades
 * the lab the moment it is affordable.
 *
 * Optimal rather than average on purpose — it measures the *floor* on how
 * long progression takes. A real player is slower, never faster, so any
 * pacing problem this finds is real and any it misses could still exist.
 */
export function simulate(options: SimulationOptions): SimulationReport {
  const clock = new SimulationClock();
  const context = new GameContext({ clock, storage: new MemoryStorage() });
  context.start();

  const {
    mergeSystem,
    generatorSystem,
    energySystem,
    orderSystem,
    progressionSystem,
    generators,
    orders,
    labStages,
    state,
  } = context;

  const generatorIds = generators.all().map((generator) => generator.id);
  // Best-first: a 25-coin order for one Steam beats a 10-coin order for two
  // Water, and the greedy player should always take the better trade.
  const orderIds = orders
    .all()
    .slice()
    .sort((a, b) => b.coinReward - a.coinReward)
    .map((order) => order.id);

  const stages: StageRecord[] = [];
  const ordersCompleted: Record<string, number> = {};
  const blocked: Record<BlockedReason, number> = { energy: 0, charges: 0, boardFull: 0, none: 0 };

  let generatorUses = 0;
  let merges = 0;
  let coinsEarned = 0;
  let coinsSpent = 0;
  let peakOccupiedCells = 0;
  let energySpent = 0;
  let lastStageAtMinute = 0;

  context.eventBus.on("CURRENCY_CHANGED", (event) => {
    if (event.currency !== "coins") {
      return;
    }
    if (event.delta > 0) {
      coinsEarned += event.delta;
    } else {
      coinsSpent -= event.delta;
    }
  });
  context.eventBus.on("ENERGY_SPENT", (event) => {
    energySpent += event.amount;
  });

  const totalTicks = Math.ceil((options.minutes * 60) / options.tickSeconds);

  for (let tick = 0; tick < totalTicks; tick += 1) {
    const minute = (tick * options.tickSeconds) / 60;

    // 1. Merge until nothing else can be merged. Merging first keeps the
    //    board clear, which is what stops boardFull from binding early.
    let mergedThisTick = true;
    while (mergedThisTick) {
      mergedThisTick = false;
      const pair = findMergeablePair(context);
      if (pair) {
        mergeSystem.merge(pair.from, pair.to);
        merges += 1;
        mergedThisTick = true;
      }
    }

    // 2. Deliver every order the board can satisfy, best-paying first.
    let deliveredThisTick = true;
    while (deliveredThisTick) {
      deliveredThisTick = false;
      for (const orderId of orderIds) {
        if (orderSystem.canComplete(orderId)) {
          orderSystem.complete(orderId);
          ordersCompleted[orderId] = (ordersCompleted[orderId] ?? 0) + 1;
          deliveredThisTick = true;
          break;
        }
      }
    }

    // 3. Generate as much as this tick allows, recording what stopped it.
    for (const generatorId of generatorIds) {
      let reason: BlockedReason = "none";
      while (reason === "none") {
        reason = generatorBlockedBy(context, generatorId);
        if (reason === "none") {
          generatorSystem.use(generatorId);
          generatorUses += 1;
        }
      }
      blocked[reason] += 1;
    }

    // 4. Restore the lab whenever it is affordable.
    while (progressionSystem.canUpgradeLab()) {
      const nextStage = progressionSystem.getLabStage() + 1;
      const definition = labStages.getByStage(nextStage);
      progressionSystem.upgradeLab();
      progressionSystem.unlockEligibleChapters();
      stages.push({
        stage: nextStage,
        title: definition?.title ?? `Stage ${nextStage}`,
        cost: definition?.upgradeCost ?? 0,
        reachedAtMinute: round(minute, 1),
        minutesInStage: round(minute - lastStageAtMinute, 1),
      });
      lastStageAtMinute = minute;
    }

    const occupied = state.board.allCells().filter((cell) => cell.state === "OCCUPIED").length;
    peakOccupiedCells = Math.max(peakOccupiedCells, occupied);

    clock.advance(options.tickSeconds * 1000);
    energySystem.update();
  }

  context.stop();

  return {
    tickSeconds: options.tickSeconds,
    simulatedMinutes: options.minutes,
    stages,
    finalStage: progressionSystem.getLabStage(),
    coinsEarned,
    coinsSpent,
    generatorUses,
    merges,
    ordersCompleted,
    blocked,
    ticks: totalTicks,
    peakOccupiedCells,
    energyPerCoin: coinsEarned > 0 ? round(energySpent / coinsEarned, 3) : 0,
  };
}

/** First mergeable pair on the board, scanning in cell order. */
function findMergeablePair(
  context: GameContext,
): { from: BoardPosition; to: BoardPosition } | undefined {
  const occupied = context.state.board
    .allCells()
    .filter((cell) => cell.state === "OCCUPIED" && cell.itemId)
    .map((cell) => ({ x: cell.x, y: cell.y }));

  for (const [index, from] of occupied.entries()) {
    for (const to of occupied.slice(index + 1)) {
      if (context.mergeSystem.canMerge(from, to)) {
        return { from, to };
      }
    }
  }

  return undefined;
}

/**
 * Why `use()` would throw right now, without calling it. Mirrors
 * GeneratorSystem's own validation order — energy, charges, then space —
 * so the counts name the same constraint the game would report.
 */
function generatorBlockedBy(context: GameContext, generatorId: string): BlockedReason {
  const definition = context.generators.requireById(generatorId);
  const state = context.generatorSystem.getState(generatorId);

  if (state.chargesRemaining <= 0) {
    return "charges";
  }
  if (!context.energySystem.canSpend(definition.energyCost)) {
    return "energy";
  }
  if (!context.boardSystem.findFirstEmptyCell()) {
    return "boardFull";
  }
  return "none";
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatReport(report: SimulationReport): string {
  const lines: string[] = [];
  const hours = (minutes: number) => `${round(minutes / 60, 1)}h`;

  lines.push("");
  lines.push("Merge Lab — economy simulation");
  lines.push("=".repeat(60));
  lines.push(
    `Optimal play, ${report.simulatedMinutes} simulated minutes ` +
      `(${hours(report.simulatedMinutes)}), ${report.tickSeconds}s ticks.`,
  );
  lines.push("");

  lines.push("Lab stages reached");
  lines.push("-".repeat(60));
  if (report.stages.length === 0) {
    lines.push("  none — not even the first upgrade was affordable.");
  }
  for (const stage of report.stages) {
    lines.push(
      `  ${stage.stage}. ${stage.title.padEnd(24)} ${String(stage.cost).padStart(5)} coins  ` +
        `at ${hours(stage.reachedAtMinute).padStart(6)}  (+${hours(stage.minutesInStage)})`,
    );
  }
  const maxStage = 5;
  if (report.finalStage < maxStage) {
    lines.push(
      `  ...stage ${report.finalStage + 1} not reached within ${hours(report.simulatedMinutes)}.`,
    );
  }
  lines.push("");

  lines.push("Throughput");
  lines.push("-".repeat(60));
  lines.push(`  Coins earned          ${report.coinsEarned}`);
  lines.push(`  Coins spent           ${report.coinsSpent}`);
  lines.push(
    `  Coins per minute      ${round(report.coinsEarned / report.simulatedMinutes, 2)}` +
      `  (${round((report.coinsEarned / report.simulatedMinutes) * 60, 1)}/h)`,
  );
  lines.push(`  Generator uses        ${report.generatorUses}`);
  lines.push(`  Merges                ${report.merges}`);
  lines.push(`  Energy per coin       ${report.energyPerCoin}`);
  for (const [orderId, count] of Object.entries(report.ordersCompleted)) {
    lines.push(`  ${orderId.padEnd(22)}${count} delivered`);
  }
  lines.push("");

  lines.push("Binding constraint");
  lines.push("-".repeat(60));
  const totalBlocks = Object.values(report.blocked).reduce((sum, n) => sum + n, 0);
  for (const [reason, count] of Object.entries(report.blocked)) {
    const share = totalBlocks > 0 ? round((count / totalBlocks) * 100, 1) : 0;
    lines.push(`  ${reason.padEnd(12)}${String(count).padStart(7)} ticks  ${share}%`);
  }
  lines.push(
    `  Peak board use      ${report.peakOccupiedCells}/` +
      `${runtimeConfig.boardCols * runtimeConfig.boardRows} cells`,
  );
  lines.push("");

  return lines.join("\n");
}
