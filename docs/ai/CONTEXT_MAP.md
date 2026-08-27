# CONTEXT MAP

Retrieval map: classify the task, load only the rows below it. This is the
file that keeps a scoped change from costing a full-spec read.

`docs/MASTER_SPEC.md` is the **20-level campaign canon**, §1–§60. Every row
below now cites canon by section, or says plainly that canon does not cover
the topic. The old `A5` / `A16` / `B2` references are gone.

**Canon does not cover the whole engine, and that is not a gap in the map.**
It specifies the campaign — levels, progression, narrative, data contracts,
events, analytics, acceptance. It says nothing about item and merge rules,
generators, energy, the currency model, the save schema, monetization or UI.
For those the authority is the ADR or design document named in the row, and
the row says "not in canon" rather than pointing at a section that does not
discuss it. A false citation is worse than an honest absence.

| Topic                | Canon                                 |
| -------------------- | ------------------------------------- |
| Progression model    | §2, §3 (completion), §6 (pacing)      |
| Requirement types    | §4                                    |
| XP sources           | §5                                    |
| Levels 1–20          | §7–§26, table at §27                  |
| Level data contract  | §28, §31 (unlock), §32 (idempotency)  |
| Narrative beats      | §29, §34 (story rule), §35 (delivery) |
| Chapters             | §30                                   |
| Content unlock       | §33                                   |
| Lab visuals          | §36                                   |
| Difficulty           | §37, §38                              |
| Board expansion      | §39                                   |
| Orders               | §40                                   |
| Quests               | §41                                   |
| Research             | §42                                   |
| Implementation files | §46                                   |
| Required events      | §47                                   |
| Required analytics   | §48                                   |
| Acceptance tests     | §49–§55                               |
| AI procedure         | §56                                   |
| PM approval          | §57                                   |

Everything else below is a path that exists today.

Every task also implicitly loads `PROJECT_MEMORY.md` (automatic) and should
check `docs/architecture/ADR/` for a binding prior decision.

---

## Board

- Canon: §39 (board expansion; the 7×9 grid itself is not specified elsewhere)
- Docs: `architecture/system-map.md`, `architecture/data-contracts.md`
- Code: `src/domain/board/`, `src/systems/BoardSystem.ts`,
  `src/systems/BoardExpansionSystem.ts`, `src/config/runtime.ts`
- Content: `content/board-sections/*.json`
- Tests: `tests/unit/Board.test.ts`, `tests/unit/BoardSystem.test.ts`,
  `tests/unit/BoardExpansionSystem.test.ts`,
  `tests/integration/board-expansion.test.ts`
- ADR: 0011

## Merge

- Canon: not covered — merge rules are an invariant of this repo, not canon
- Docs: `architecture/data-contracts.md`, `design/game-design.md`
- Code: `src/systems/MergeSystem.ts`, `src/domain/items/`, `src/domain/board/`
- Tests: `tests/unit/MergeSystem.test.ts`, `tests/integration/first-merge.test.ts`

## Items and content definitions

- Canon: not covered — item and merge-chain shape is a repo contract
- Docs: `design/content-pipeline.md`, `architecture/data-contracts.md`
- Code: `src/domain/items/`, `src/infrastructure/content/ContentLoader.ts`,
  `content/items/`, `tools/content-validator/`
- Tests: `tests/unit/ItemDefinition.test.ts`, `tests/unit/ItemRegistry.test.ts`

## Generators and energy

- Canon: not covered — generators and energy are repo mechanics
- Docs: `design/economy.md`
- Code: `src/systems/GeneratorSystem.ts`, `src/systems/EnergySystem.ts`,
  `src/domain/generators/`, `src/infrastructure/clock/Clock.ts`,
  `content/generators/`
- Tests: `tests/unit/GeneratorSystem.test.ts`, `tests/unit/EnergySystem.test.ts`,
  `tests/unit/GeneratorRegistry.test.ts`

## Economy and currencies

- Canon: §42 covers research points only; the wider economy is not covered
- Docs: `design/economy.md`
- Code: `src/systems/EconomySystem.ts`, `src/systems/events/DomainEvent.ts`
  (`CurrencyKind`)
- Tests: `tests/unit/EconomySystem.test.ts`
- Tooling: `tools/economy-simulator/` (`pnpm economy:simulate`) — run it
  before and after any balance change and quote the numbers

## Orders

- Canon: §40 (order progression across the 20 levels)
- Docs: `design/economy.md`, `design/game-design.md`
- Code: `src/systems/OrderSystem.ts`, `src/domain/orders/`, `content/orders/`
- Tests: `tests/unit/OrderSystem.test.ts`, `tests/unit/OrderRegistry.test.ts`,
  `tests/integration/first-order.test.ts`

## Campaign (levels 1–20)

- Canon: `MASTER_SPEC.md` §2–§6 (model), §7–§26 (per level), §28–§33
  (contracts), §39–§43 (progression), §49–§55 (acceptance tests)
- Docs: `design/campaign-gap-analysis.md` — **read this first**: what canon
  requires vs what exists, the open conflicts, and the build order
- Code: nothing yet. The nearest existing pieces are
  `src/systems/ProgressionSystem.ts`, `src/domain/progression/`,
  `src/systems/QuestSystem.ts` (requirement evaluation)

## Progression, lab stages, chapters

- Canon: §2 (progression model), §36 (lab visual progression)
- Docs: `design/game-design.md`
- Code: `src/systems/ProgressionSystem.ts`, `src/domain/progression/`,
  `content/lab-stages/`, `content/chapters/`
- Tests: `tests/unit/ProgressionSystem.test.ts`, `tests/unit/LevelCurve.test.ts`

## Quests

- Canon: §41 (quest progression), §4 (requirement types)
- Docs: `design/game-design.md`
- Code: `src/systems/QuestSystem.ts`, `src/domain/quests/`, `content/quests/`,
  `src/domain/progression/ProgressionRequirement.ts` (the shared predicate)
- ADR: 0007 (one predicate for quests and campaign levels)
- Tests: `tests/unit/QuestSystem.test.ts`

## Narrative and dialogue

- Canon: §29 (beat contract), §34 (story rule), §35 (delivery priority)
- Docs: `design/narrative.md`
- Code: `src/systems/DialogueSystem.ts`, `src/domain/dialogues/`,
  `src/presentation/npc/DialogueView.ts`, `content/dialogues/`
- Tests: `tests/unit/DialogueSystem.test.ts`, `tests/unit/DialogueRegistry.test.ts`

## Tutorial

- Canon: §7 (Level 1 opening beats); the tutorial mechanism is not covered
- Docs: `design/game-design.md`, `design/narrative.md`
- Code: `src/systems/TutorialSystem.ts`, `src/domain/tutorial/`,
  `src/presentation/ui/TutorialBanner.ts`, `content/tutorial/`
- Tests: `tests/unit/TutorialSystem.test.ts`

## Save and persistence

- Canon: not covered — the save schema is a repo contract (ADR-0001, ADR-0006)
- Docs: `architecture/data-contracts.md`
- Code: `src/infrastructure/persistence/SaveSystem.ts`,
  `src/domain/save/SaveDataV1.ts`, `src/domain/GameState.ts`
- Tests: `tests/unit/SaveSystem.test.ts`, `tests/unit/SaveDataV1.test.ts`
- ADR: 0001 (trust boundary — saves are untrusted input)

## UI and presentation

- Canon: §36 covers lab visuals only; UI structure is not covered
- Docs: `architecture/system-map.md`
- Code: `src/presentation/` (scenes, `BoardView`, `Hud`, `ActionBar`, `theme.ts`),
  `src/app/GameApp.ts`
- Tests: `tests/e2e/smoke.spec.ts`, `tests/e2e/visual.spec.ts`
- ADR: 0002 (what visual QA does and does not cover)

## Analytics

- Canon: §48 (required analytics)
- Docs: `architecture/system-map.md`
- Code: `src/application/services/AnalyticsBridge.ts`,
  `src/infrastructure/analytics/`
- Tests: `tests/unit/AnalyticsBridge.test.ts`, `tests/unit/AnalyticsAdapters.test.ts`,
  `tests/integration/analytics-flow.test.ts`

## Monetization

- Canon: not covered — canon says nothing about monetization at all
- Docs: `design/monetization.md`, `design/economy.md`
- Code: `src/application/services/MonetizationService.ts`,
  `src/infrastructure/ads/`, `src/infrastructure/billing/`,
  `src/infrastructure/flags/`
- Tests: `tests/unit/MonetizationService.test.ts`,
  `tests/unit/MonetizationAdapters.test.ts`,
  `tests/integration/monetization-flow.test.ts`

## Events and system wiring

- Canon: §46 (implementation files), §47 (required events)
- Docs: `architecture/system-map.md`
- Code: `src/systems/events/DomainEvent.ts`, `src/systems/events/EventBus.ts`,
  `src/app/GameContext.ts`

## Mechanic design (proposed)

- Canon: not covered — see the open question in `design/mechanic-pipeline.md`
- Docs: `design/mechanic-pipeline.md`, `design/mechanics/README.md`,
  `design/mechanics/TEMPLATE.md`
- ADR: 0008 (**Proposed** — not binding until Accepted)
- Load this row when a task asks for a _new or changed gameplay rule_ rather
  than new content. Classification (M0–M4) comes before design.

## Content pipeline

- Canon: §46 (recommended content files)
- Docs: `design/content-pipeline.md`
- Code: `content/`, `tools/content-validator/`,
  `src/infrastructure/content/ContentLoader.ts`

## Testing and QA

- Canon: §49–§55 (per-level acceptance tests)
- Docs: `qa/test-strategy.md`, `qa/acceptance.md`
- Code: `vite.config.ts` (Vitest), `playwright.config.ts`, `tests/`
- ADR: 0002

## Build, tooling, CI

- Canon: not covered — build tooling is a repo decision (ADR-0001)
- Docs: `architecture/system-map.md`
- Code: `package.json`, `vite.config.ts`, `tsconfig.*.json`,
  `eslint.config.js`, `.github/workflows/ci.yml`
- ADR: 0001

## PWA and offline

- Canon: not covered — PWA is a delivery decision (ADR-0005)
- Code: `src/infrastructure/pwa/registerServiceWorker.ts`,
  `src/presentation/pwa/updateBanner.ts`, `vite.config.ts` (`vite-plugin-pwa`),
  `src/main.ts`

## Mobile / Android

- Canon: not covered — packaging is a repo decision (ADR-0003, ADR-0005)
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
