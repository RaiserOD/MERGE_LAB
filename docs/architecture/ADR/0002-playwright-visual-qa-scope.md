```text
ADR-ID: 0002
TITLE: Playwright wiring and visual-QA scope (ML-036)
STATUS: Accepted
CONTEXT:
  ADR-0001 deferred visual/screenshot QA (Playwright) until there was a real
  UI to screenshot. That UI now exists (Stages 6-9: board, HUD, dialogue,
  tutorial). The obvious next step is `toHaveScreenshot()` pixel-diff
  regression testing against a committed baseline — but a baseline image
  generated on one machine/OS/GPU/font-rendering stack does not reliably
  match another's, and this project has no process yet for generating that
  baseline from within CI itself (the only environment whose renderer
  actually matters for CI to stay green).
DECISION:
  - Add `@playwright/test`, pinned to the exact version of the Chromium
    build already available in this project's environments, with
    `tests/e2e/` as its own test directory, separate from Vitest's
    `tests/unit`/`tests/integration` (Vitest's `include` glob narrowed
    accordingly so it doesn't try to run Playwright specs).
  - Scope the first e2e suite to two things: (1) a functional smoke test —
    boot, dismiss the chapter intro, drag-merge the two starter items,
    assert on the resulting save data and zero console errors — formalizing
    the ad-hoc Playwright scripts used throughout this project's manual
    verification; (2) a screenshot *capture*, attached to the HTML report
    for a human to look at, not compared against a baseline.
  - CI runs e2e as its own job: install Playwright's own Chromium via
    `playwright install --with-deps`, run `pnpm test:e2e`, upload the HTML
    report (with the attached screenshot) as a build artifact.
ALTERNATIVES:
  - `toHaveScreenshot()` against a locally-generated baseline: rejected for
    now — the first CI run would almost certainly fail on antialiasing/font
    differences, for a false-negative reason unrelated to any real
    regression. Revisit once there's a deliberate process for generating
    (and periodically refreshing) baselines from a CI run itself, e.g. a
    workflow step that runs `--update-snapshots` and commits the result.
  - Running e2e against a production build (`vite build` + `vite preview`):
    rejected for the *first* suite — `vite dev` starts faster and is what
    every manual verification pass in this project already used, so the
    e2e suite exercises the same server mode already proven to catch real
    bugs (missing PWA icons, the CSP meta-tag issue, the missing lab-upgrade
    button were all found via `pnpm dev`, not a production build).
CONSEQUENCES:
  - A real visual regression (a color, a layout shift) is only caught if a
    human looks at the attached screenshot in the HTML report — it does not
    fail CI by itself. This is a deliberate, temporary trade-off, not an
    oversight.
  - Adding `toHaveScreenshot()` later is additive: same test files, same
    `testDir`, just a new assertion once a baseline-generation process
    exists.
MIGRATION:
  N/A — additive to ADR-0001's bootstrap; no existing tooling changes.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-25
```
