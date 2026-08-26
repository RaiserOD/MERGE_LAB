# CONTEXT MAP

Retrieval map: classify the task, load only the rows below it. This is the
file that keeps a scoped change from costing a full-spec read.

Spec section references (A5, A16, …) point into `docs/MASTER_SPEC.md`, which
is **not yet checked into this repo** — see the note in `PROJECT_MEMORY.md`.
Everything else below is a path that exists today.

Every task also implicitly loads `PROJECT_MEMORY.md` (automatic) and should
check `docs/architecture/ADR/` for a binding prior decision.

---

## Board

- Spec: A5
- Docs: `architecture/system-map.md`, `architecture/data-contracts.md`
- Code: `src/domain/board/`, `src/systems/BoardSystem.ts`, `src/config/runtime.ts`
- Tests: `tests/unit/Board.test.ts`, `tests/unit/BoardSystem.test.ts`

## Merge

- Spec: A5, A6
- Docs: `architecture/data-contracts.md`, `design/game-design.md`
- Code: `src/systems/MergeSystem.ts`, `src/domain/items/`, `src/domain/board/`
- Tests: `tests/unit/MergeSystem.test.ts`, `tests/integration/first-merge.test.ts`

## Items and content definitions

- Spec: A6
- Docs: `design/content-pipeline.md`, `architecture/data-contracts.md`
- Code: `src/domain/items/`, `src/infrastructure/content/ContentLoader.ts`,
  `content/items/`, `tools/content-validator/`
- Tests: `tests/unit/ItemDefinition.test.ts`, `tests/unit/ItemRegistry.test.ts`

## Generators and energy

- Spec: A7, A8
- Docs: `design/economy.md`
- Code: `src/systems/GeneratorSystem.ts`, `src/systems/EnergySystem.ts`,
  `src/domain/generators/`, `src/infrastructure/clock/Clock.ts`,
  `content/generators/`
- Tests: `tests/unit/GeneratorSystem.test.ts`, `tests/unit/EnergySystem.test.ts`,
  `tests/unit/GeneratorRegistry.test.ts`

## Economy and currencies

- Spec: A9, A16
- Docs: `design/economy.md`
- Code: `src/systems/EconomySystem.ts`, `src/systems/events/DomainEvent.ts`
  (`CurrencyKind`)
- Tests: `tests/unit/EconomySystem.test.ts`
- Tooling: `tools/economy-simulator/` (`pnpm economy:simulate`) — run it
  before and after any balance change and quote the numbers

## Orders

- Spec: A10
- Docs: `design/economy.md`, `design/game-design.md`
- Code: `src/systems/OrderSystem.ts`, `src/domain/orders/`, `content/orders/`
- Tests: `tests/unit/OrderSystem.test.ts`, `tests/unit/OrderRegistry.test.ts`,
  `tests/integration/first-order.test.ts`

## Progression, lab stages, chapters

- Spec: A11, A12
- Docs: `design/game-design.md`
- Code: `src/systems/ProgressionSystem.ts`, `src/domain/progression/`,
  `content/lab-stages/`, `content/chapters/`
- Tests: `tests/unit/ProgressionSystem.test.ts`, `tests/unit/LevelCurve.test.ts`

## Quests

- Spec: A13
- Docs: `design/game-design.md`
- Code: `src/systems/QuestSystem.ts`, `src/domain/quests/`, `content/quests/`
- Tests: `tests/unit/QuestSystem.test.ts`

## Narrative and dialogue

- Spec: A14, A15
- Docs: `design/narrative.md`
- Code: `src/systems/DialogueSystem.ts`, `src/domain/dialogues/`,
  `src/presentation/npc/DialogueView.ts`, `content/dialogues/`
- Tests: `tests/unit/DialogueSystem.test.ts`, `tests/unit/DialogueRegistry.test.ts`

## Tutorial

- Spec: A20
- Docs: `design/game-design.md`, `design/narrative.md`
- Code: `src/systems/TutorialSystem.ts`, `src/domain/tutorial/`,
  `src/presentation/ui/TutorialBanner.ts`, `content/tutorial/`
- Tests: `tests/unit/TutorialSystem.test.ts`

## Save and persistence

- Spec: A23
- Docs: `architecture/data-contracts.md`
- Code: `src/infrastructure/persistence/SaveSystem.ts`,
  `src/domain/save/SaveDataV1.ts`, `src/domain/GameState.ts`
- Tests: `tests/unit/SaveSystem.test.ts`, `tests/unit/SaveDataV1.test.ts`
- ADR: 0001 (trust boundary — saves are untrusted input)

## UI and presentation

- Spec: A18, A19
- Docs: `architecture/system-map.md`
- Code: `src/presentation/` (scenes, `BoardView`, `Hud`, `ActionBar`, `theme.ts`),
  `src/app/GameApp.ts`
- Tests: `tests/e2e/smoke.spec.ts`, `tests/e2e/visual.spec.ts`
- ADR: 0002 (what visual QA does and does not cover)

## Analytics

- Spec: A24
- Docs: `architecture/system-map.md`
- Code: `src/application/services/AnalyticsBridge.ts`,
  `src/infrastructure/analytics/`
- Tests: `tests/unit/AnalyticsBridge.test.ts`, `tests/unit/AnalyticsAdapters.test.ts`,
  `tests/integration/analytics-flow.test.ts`

## Monetization

- Spec: A17
- Docs: `design/monetization.md`, `design/economy.md`
- Code: `src/application/services/MonetizationService.ts`,
  `src/infrastructure/ads/`, `src/infrastructure/billing/`,
  `src/infrastructure/flags/`
- Tests: `tests/unit/MonetizationService.test.ts`,
  `tests/unit/MonetizationAdapters.test.ts`,
  `tests/integration/monetization-flow.test.ts`

## Events and system wiring

- Spec: A21, A22
- Docs: `architecture/system-map.md`
- Code: `src/systems/events/DomainEvent.ts`, `src/systems/events/EventBus.ts`,
  `src/app/GameContext.ts`

## Content pipeline

- Spec: A25
- Docs: `design/content-pipeline.md`
- Code: `content/`, `tools/content-validator/`,
  `src/infrastructure/content/ContentLoader.ts`

## Testing and QA

- Spec: A27
- Docs: `qa/test-strategy.md`, `qa/acceptance.md`
- Code: `vite.config.ts` (Vitest), `playwright.config.ts`, `tests/`
- ADR: 0002

## Build, tooling, CI

- Spec: B1, B3
- Docs: `architecture/system-map.md`
- Code: `package.json`, `vite.config.ts`, `tsconfig.*.json`,
  `eslint.config.js`, `.github/workflows/ci.yml`
- ADR: 0001

## PWA and offline

- Spec: B2 step 19
- Code: `src/infrastructure/pwa/registerServiceWorker.ts`,
  `src/presentation/pwa/updateBanner.ts`, `vite.config.ts` (`vite-plugin-pwa`),
  `src/main.ts`

## Mobile / Android

- Spec: B2 step 20
- Code: `capacitor.config.ts`, `android/`, `.github/workflows/ci.yml`
  (`android` job)
- ADR: 0003 (Capacitor), 0005 (Android is the release target; iOS kept
  reachable but not planned — read before anything platform-shaped)

## Security and trust boundary

- Docs: `SECURITY.md`
- Code: `index.html` (CSP), `src/domain/save/SaveDataV1.ts`,
  `.github/workflows/ci.yml` (audit + secret scanning)
- ADR: 0001

## Dev/QA tooling in-game

- Code: `src/presentation/debug/DebugPanel.ts` (dev-only, `import.meta.env.DEV`)
- Docs: `qa/test-strategy.md`
