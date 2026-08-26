# Merge Lab

Merge-2 / collection / light-simulation game. Phaser 3 + TypeScript + Vite.

This file is loaded automatically into every session, so it stays small. It
imports the project's short memory and working rules, and routes to everything
else on demand.

@docs/ai/PROJECT_MEMORY.md

@docs/ai/AI_RULES.md

## Start every task here

1. `docs/ai/CURRENT_STATE.md` — what exists, what's in flight, what's blocked.
2. `docs/ai/ACTIVE_TASK.md` — the task in progress, or write one down.
3. `docs/ai/CONTEXT_MAP.md` — classify the task, then load **only** the
   documents and source files it lists for that area.
4. `docs/architecture/ADR/` — check for a decision that already settles it.

Do not read the full spec or the whole `src/` tree for a scoped change. If
the map doesn't cover an area, add a row to it rather than reading everything.

## Commands

```bash
pnpm dev              # dev server
pnpm test             # Vitest unit + integration
pnpm test:e2e         # Playwright (needs Chromium; see README)
pnpm lint             # ESLint
pnpm typecheck        # tsc -b --noEmit
pnpm content:validate # validate content/**/*.json
pnpm build            # production build
pnpm cap:sync         # build + copy web bundle into android/
```

## Before you finish

Run lint, typecheck, test, and build. Then update `CURRENT_STATE.md` — an
agent that lands code without updating it leaves the next agent working from
a lie.
