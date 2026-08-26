# Test strategy

Canon is `docs/MASTER_SPEC.md` (A27). What each layer of testing is for, and
what it deliberately doesn't cover.

## Layers

| Layer        | Tool        | Location                   | Covers                                          |
| ------------ | ----------- | -------------------------- | ----------------------------------------------- |
| Unit         | Vitest      | `tests/unit/`              | One class/module: rules, validation, edge cases |
| Integration  | Vitest      | `tests/integration/`       | A real `GameContext` end to end, headlessly     |
| E2E / visual | Playwright  | `tests/e2e/`               | The actual game in a real browser               |
| Content      | tsx         | `tools/content-validator/` | Content shape and cross-references              |
| Static       | ESLint, tsc | —                          | Layer boundaries, types                         |

Vitest and Playwright are kept strictly apart: `vite.config.ts` narrows
`test.include` to `tests/unit/**` and `tests/integration/**` so `pnpm test`
never tries to run a Playwright spec.

## Why integration tests build a real GameContext

Because the architecture makes it cheap. No Phaser type appears in the domain
graph, so `new GameContext({ clock, storage })` runs headlessly with a fake
clock and in-memory storage. `tests/integration/first-merge.test.ts` drives an
actual merge through actual systems — that catches wiring bugs that unit tests
with mocks structurally cannot.

If a change makes `GameContext` impossible to construct in a test, that's a
layering regression, not a test problem.

## Determinism

Two seams keep tests deterministic, and both must stay injected:

- `Clock` — `tests/fixtures/FixedClock.ts`. Nothing in domain or systems calls
  `Date.now()`.
- `KeyValueStorage` — `tests/fixtures/InMemoryStorage.ts`. Nothing but
  `SaveSystem` touches `localStorage`.

Content fixtures live in `tests/fixtures/test*.ts` so tests don't depend on
shipped content staying the shape they assume.

## What e2e covers

`tests/e2e/smoke.spec.ts` boots the real game and asserts: the board renders,
a real drag-and-drop merge reduces two occupied cells to one, the tutorial
records `tutorial.first_merge`, and **zero console errors**. The console-error
assertion catches a whole class of failures no unit test sees.

`tests/e2e/visual.spec.ts` captures a screenshot and attaches it to the HTML
report. Per ADR-0002 there is **no pixel baseline** — a visual regression will
not fail the build; a human looks at the artifact. Don't describe this as
visual regression testing.

## Known fragility

`smoke.spec.ts` duplicates `BoardView`'s cell-geometry math inline to compute
where to drag. A layout change in the view desyncs it silently — the test will
drag at the wrong coordinates and fail in a way that looks like a merge bug.
If you change board layout constants, change them in both places.

## In-game QA tooling

`src/presentation/debug/DebugPanel.ts` — a dev-only panel (grant currency,
refill energy, skip tutorial, unlock the next chapter, wipe the save). Gated
behind `import.meta.env.DEV` and verified absent from production bundles. It
mutates state directly and bypasses the rules it's cheating past; that's the
point, but it means a bug reproduced only via the panel may not be reachable
in a real session.

## What isn't tested

- **Property-based tests.** `tests/property/` is empty. The deterministic
  state model is a natural fit (merge invariants, save round-trips).
- **Save migrations.** No v2 exists, so no migration has been exercised.
- **Android runtime.** CI proves the APK _builds_; nothing has booted it on a
  device or emulator.
- **Offline PWA in CI.** Offline boot was verified by hand in a browser, not
  by an automated test.
- **Performance.** No frame-rate or memory budget is measured anywhere.

## Before claiming a change works

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus
`pnpm content:validate` for content changes and `pnpm test:e2e` for
presentation changes. Report which ones actually ran.
