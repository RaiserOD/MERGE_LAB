# AI RULES

Working rules for any AI agent changing this repository. These are not new
policy — they collect what the master spec (A28 AI development protocol, B9
human PM control) and the ADRs already require, in one place an agent can act
on.

## Before coding

1. Read `PROJECT_MEMORY.md` (auto-loaded via `CLAUDE.md`).
2. Read `CURRENT_STATE.md` — what already exists, what is in flight.
3. Read `ACTIVE_TASK.md` — if `STATUS: NONE`, write the task down first.
4. Classify the task, then use `CONTEXT_MAP.md` to pull **only** the documents
   and source files that task actually needs.
5. Check `docs/architecture/ADR/` for a decision that already settles the
   question. A prior decision is binding until an ADR supersedes it.
6. Read the existing implementation before proposing a new one.

Reading the whole spec, or the whole `src/` tree, for a scoped task is a
failure of this process, not thoroughness.

## During coding

- Make the smallest change that satisfies the task.
- Respect existing contracts; don't reshape an interface to avoid a rename.
- Don't touch files outside `FILES_ALLOWED_TO_CHANGE` without saying why.
- Don't put gameplay logic in `src/presentation/` — scenes render and dispatch.
- Don't import Phaser from domain/systems/application (ESLint enforces this).
- Don't touch `localStorage` outside `SaveSystem`.
- Don't call analytics outside `AnalyticsBridge`, or ads/billing outside
  `MonetizationService`.
- Don't use `any` or non-null assertions without a written justification.
- Match the surrounding code's naming, comment density, and idiom.

## After coding

1. `pnpm lint` — clean.
2. `pnpm typecheck` — clean.
3. `pnpm test` — all green.
4. `pnpm content:validate` — clean, if content or its schemas changed.
5. `pnpm build` — succeeds.
6. `pnpm test:e2e` — if presentation or boot changed.
7. Update `CURRENT_STATE.md`: move the task from **In progress** to
   **Completed**, refresh system coverage and the date.
8. Close out `ACTIVE_TASK.md` (`STATUS: DONE` + result), then reset it.
9. Report: changed files, test results, and anything left unresolved.

Reporting a step as done without running it is the one failure mode that
poisons everything downstream. If a check couldn't run, say which and why.

## Stop and ask for human approval

These are not judgment calls. Stop, state the options, and wait:

- A new mechanic, currency, or resource is required.
- Monetization behavior, pricing, or the rewards/IAP catalog changes.
- The architecture or a layer boundary changes.
- Scope changes — anything touching the MVP non-goals list.
- A platform is added or dropped.
- Narrative canon changes.
- A new third-party vendor or SDK is introduced (analytics, ads, billing,
  crash reporting).
- Board dimensions, save-schema version, or another documented invariant
  changes.

Approved decisions in these categories get an ADR in
`docs/architecture/ADR/` before the code lands.

## Spec/implementation conflicts

If canon and code disagree — say the spec sets a merge cost of 0 and the code
charges 5 — do **not** pick a side and code against it. Report the conflict
with both references and let the human PM decide which one is wrong. Silently
"fixing" the code to match a stale doc, or a doc to match accidental code, is
how canon rots.
