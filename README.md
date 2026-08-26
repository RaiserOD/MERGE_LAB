# Merge Lab

Merge-2 / collection / light-simulation game. The player restores an
abandoned laboratory by generating, merging and discovering materials.
Full product/design/technical spec belongs at `docs/MASTER_SPEC.md` — see
"Documentation" below for how the docs are laid out.

Platform: Android. The web build is the shared bundle Android ships and the
development/QA surface, not a separate release; iOS is kept possible but is
not planned (see `docs/architecture/ADR/0005-android-only-release-target.md`).
Stack: Phaser 3 + TypeScript + Vite.

## Getting started

```bash
pnpm install
pnpm dev            # local dev server
pnpm test            # unit tests (Vitest)
pnpm lint            # ESLint
pnpm typecheck        # tsc -b --noEmit
pnpm content:validate # validate content/**/*.json against domain schemas
pnpm build            # production build
pnpm test:e2e         # Playwright end-to-end/visual QA (needs Chromium — see below)
```

`pnpm test:e2e` needs a Chromium build Playwright knows about. If you already
have one (e.g. `PLAYWRIGHT_BROWSERS_PATH` set), it's reused as-is; otherwise
run `pnpm exec playwright install --with-deps chromium` once first. CI does
this automatically in its own job.

Node version is pinned in `.nvmrc` (22). Package manager is pnpm — see
`packageManager` in `package.json`.

## Architecture

Layered, with a hard rule enforced by ESLint: **domain code never imports
Phaser**.

- `src/domain/` — pure game rules, content types, state models (no Phaser).
- `src/systems/` — commands/state transitions/orchestration.
- `src/application/` — command/handler/service wiring.
- `src/presentation/` — Phaser scenes, sprites, UI. The only layer allowed
  to import Phaser.
- `src/infrastructure/` — save, analytics, ads, billing, clock, random. The
  only layer allowed to talk to third-party SDKs or `localStorage`.
- `content/` — data-driven game content (items, generators, orders,
  quests, chapters, events, dialogues, economy, localization), validated by
  `tools/content-validator`.

See `docs/architecture/ADR/` for the decisions behind this structure,
starting with `0001-stack-and-trust-boundary.md`.

## Documentation

Docs are organized as a retrieval layer so a scoped change doesn't require
reading everything — see `docs/architecture/ADR/0004-ai-memory-layer.md`.

| Where                       | What it answers                                         |
| --------------------------- | ------------------------------------------------------- |
| `docs/MASTER_SPEC.md`       | Canon: what the game should be _(not yet in this repo)_ |
| `docs/ai/PROJECT_MEMORY.md` | The fundamentals and invariants, always loaded          |
| `docs/ai/CURRENT_STATE.md`  | What's built, what's blocked, known gaps                |
| `docs/ai/CONTEXT_MAP.md`    | Which docs and files a given task needs                 |
| `docs/ai/AI_RULES.md`       | Working rules and what requires human approval          |
| `docs/ai/ACTIVE_TASK.md`    | The task in flight                                      |
| `docs/architecture/`        | System map, data contracts, ADRs                        |
| `docs/design/`              | Game design, economy, monetization, narrative, content  |
| `docs/qa/`                  | Test strategy and acceptance criteria                   |

Start at `CLAUDE.md` in the repo root. Precedence when sources disagree:
spec → ADR → docs → `docs/ai/CURRENT_STATE.md` → code. Report conflicts rather than
resolving them silently.

## Current state

The core loop is playable end to end: `pnpm dev` opens a board where you
drag items to merge them, run the generator, deliver orders, restore lab
stages, and follow a Professor-narrated tutorial through all of it — with
progress saved to `localStorage` between reloads. The Android build is a
Capacitor shell around that same bundle, compiled as a debug APK in CI; the
bundle is also an installable, offline-capable PWA, which is what Capacitor
wraps and what the e2e tests drive.

Analytics and monetization are wired but inert: both sit behind adapters
with `Noop` defaults, and monetization additionally behind feature flags
that ship off — so the game has zero analytics footprint and zero ad/IAP
surface until a vendor is chosen. A dev-only QA panel (`import.meta.env
.DEV`-gated, tree-shaken from production) gives testers cheats.

**For the detailed, maintained status** — what's done, what's blocked on a
decision, known gaps and debt — see `docs/ai/CURRENT_STATE.md`. It is kept
current; this paragraph is orientation only.

## Security

See `SECURITY.md` for the trust model (client-only MVP, no server-side
economy) and the tooling rules that enforce it (dependency audit + secret
scanning in CI, CSP in `index.html`, the domain/Phaser import boundary).
