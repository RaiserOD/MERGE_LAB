#!/usr/bin/env tsx
/**
 * Runner for the economy simulator.
 *
 * The simulation itself lives in simulate.ts and imports the real
 * GameContext, which reaches content through Vite's import.meta.glob. So
 * this loads it through Vite's SSR module loader rather than running it
 * under plain tsx — that also gets the `@domain/*` path aliases for free,
 * with no second module-resolution config to keep in sync.
 *
 * Usage: pnpm economy:simulate [minutes] [tickSeconds]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import type { formatReport, simulate } from "./simulate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const DEFAULT_MINUTES = 60 * 24;
const DEFAULT_TICK_SECONDS = 30;

interface SimulateModule {
  simulate: typeof simulate;
  formatReport: typeof formatReport;
}

function parsePositive(raw: string | undefined, fallback: number, label: string): number {
  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number, got "${raw}"`);
  }
  return value;
}

async function main(): Promise<void> {
  const minutes = parsePositive(process.argv[2], DEFAULT_MINUTES, "minutes");
  const tickSeconds = parsePositive(process.argv[3], DEFAULT_TICK_SECONDS, "tickSeconds");

  const server = await createServer({
    root: projectRoot,
    configFile: path.join(projectRoot, "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "warn",
  });

  try {
    const module = (await server.ssrLoadModule("/tools/economy-simulator/simulate.ts")) as
      SimulateModule | undefined;

    if (!module?.simulate) {
      throw new Error("simulate.ts did not export simulate()");
    }

    const report = module.simulate({ minutes, tickSeconds });
    console.log(module.formatReport(report));
  } finally {
    await server.close();
  }
}

await main();
