```text
ADR-ID: 0001
TITLE: Initial stack, repository layout, and MVP trust boundary
STATUS: Accepted
CONTEXT:
  Merge Lab's master spec (Part A/B) fixes Phaser 3 + TypeScript + Vite and
  the layered architecture (domain/systems/application/presentation/
  infrastructure). It leaves several implementation-level choices open:
  package manager, mobile packaging timing, visual-QA tooling timing, and
  how much trust to place in client-held save data for the MVP economy.
DECISION:
  - Package manager: pnpm (strict lockfile, honest node_modules — reduces
    supply-chain surface vs. npm's hoisting; pinned via `packageManager`
    in package.json).
  - Node: 22 LTS, pinned via .nvmrc.
  - Content/save validation: Zod schemas in src/domain/, enforced both at
    build time (tools/content-validator) and at runtime on save load.
  - Mobile packaging (Capacitor) is deferred to Stage 8 per the spec's own
    staging (B2) — not configured in the bootstrap skeleton. Revisit this
    ADR when Stage 8 starts.
  - Visual/screenshot QA (Playwright) is deferred until there is a real UI
    to screenshot (Stage 7 / ML-036) — not configured in the bootstrap
    skeleton.
  - MVP trust boundary: no backend, no server-authoritative economy.
    SaveDataV1 is schema-validated on load (rejects malformed/corrupted
    data) but NOT protected against a player editing their own,
    schema-valid save (e.g. inflating coins). This is an accepted risk for
    a single-player, no-PvP, no-leaderboard casual game — the cost of
    cheating against yourself is low, and building server-authoritative
    validation now would be scope creep against the spec's non-goals
    (A1.5: no real-time networking). SaveDataV1's `version` field and Zod
    schema make adding server-side validation later an additive migration,
    not a rewrite.
ALTERNATIVES:
  - npm instead of pnpm: rejected — weaker guarantees against phantom
    dependencies, slightly slower CI, no meaningful ecosystem-compat
    advantage for this project's tooling (Vite/Vitest/ESLint all support
    pnpm natively).
  - Server-authoritative economy from day one: rejected for MVP — adds a
    backend, auth, and API surface the spec explicitly scopes out; revisit
    if/when leaderboards, events with shared state, or real-money trading
    are added.
CONSEQUENCES:
  - CI must run on pnpm (pnpm/action-setup in .github/workflows/ci.yml).
  - Any future backend work must treat SaveDataV1 as the wire format to
    validate server-side, not redesign it from scratch.
  - Documented in SECURITY.md so the accepted risk isn't rediscovered as a
    "bug" later.
MIGRATION:
  N/A — this is the initial bootstrap ADR.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-24
```
