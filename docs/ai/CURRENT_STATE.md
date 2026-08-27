# CURRENT STATE

Working memory: what exists, what is in flight, what is next. This is a
journal, not documentation — it goes stale the moment work lands without
updating it, and a stale entry here is worse than no entry, because agents
trust it.

**Updated:** 2026-08-27
**Stage:** B2 implementation order complete; no stage in flight

## Completed

The full B2 order, in the order the spec sets:

| B2 steps | What landed                                                         | Commit    | PR  |
| -------- | ------------------------------------------------------------------- | --------- | --- |
| 1–2      | Bootstrap: Vite, TS strict, lint/format/test, CI, CSP, shared types | `36ea990` | #1  |
| 3–6      | Content loader, `GameState`/`SaveDataV1`, board, atomic merge       | `605271d` | #1  |
| 7–8      | Generators, `EnergySystem`                                          | `c3b8615` | #1  |
| 9–10     | `EconomySystem`, `OrderSystem`                                      | `e0485a6` | #1  |
| 11       | `ProgressionSystem`, lab stages, chapter unlocks                    | `4468e84` | #1  |
| 12       | Quests                                                              | `b49a989` | #1  |
| 13       | `GameContext` + playable Phaser UI (board, HUD, drag-merge)         | `65eb4e6` | #6  |
| 14       | Narrative and dialogue                                              | `82af7c6` | #7  |
| 15       | Tutorial                                                            | `37e35b4` | #8  |
| —        | Lab upgrade button, first-repair rebalance                          | `34224ac` | #9  |
| 16       | Analytics — `AnalyticsBridge`, A24 vocabulary                       | `e7c7af4` | #10 |
| 17       | Monetization adapters — ads, billing, feature flags                 | `d6fcf04` | #12 |
| 18a      | Dev-only QA debug panel                                             | `84e72d4` | #13 |
| 18b      | Playwright e2e + screenshot capture                                 | `cfc7ecb` | #14 |
| 19       | PWA service worker + update banner                                  | `986dca7` | #15 |
| 20       | Mobile packaging — Capacitor Android                                | `f20870b` | #16 |

(PR #11 was closed unmerged and reopened as #12; PR numbers are not contiguous.)

Post-B2 work, in the order it landed:

| What landed                                                 | Commit    | PR  |
| ----------------------------------------------------------- | --------- | --- |
| AI memory layer (`docs/ai/`, `CLAUDE.md`, ADR-0004)         | `9ec50e7` | #17 |
| Android-only platform scope (ADR-0005)                      | `d0e86e2` | #18 |
| Economy simulator (`pnpm economy:simulate`)                 | `f07352b` | #19 |
| Campaign canon gap analysis                                 | `4983968` | #21 |
| Canonical save shape ahead of its systems (ADR-0006)        | `2285905` | #22 |
| Shared `ProgressionRequirement` predicate (ADR-0007)        | `a35234b` | #23 |
| Duplicate ADR-0005 resolved; numbering rule added           | `a35234b` | #24 |
| XP on merges (ADR-0009) + simulator level reporting         | `9bdeb3a` | #25 |
| Audit fixes: energy invariant, layout deduplication         | `d67b2a6` | #26 |
| Chapter ids stay order-free; `chapterNumber` (ADR-0010)     | `99a84f1` | #27 |
| Dead slots: optional `sellValue`, `content/events/` removed | `663bd7a` | #28 |
| Progressive board unlocking, canon §39 (ADR-0011)           | `cf50e41` | #30 |
| Review hardening: save trust boundary, layering, bundle     | `63ce722` | #32 |

## In progress

Nothing implemented. One documentation proposal is awaiting a PM decision:
the mechanic design pipeline (`docs/design/mechanic-pipeline.md`,
`docs/design/mechanics/`, ADR-0008 **Proposed**). It is additive docs only —
no code, content or runtime change — and no agent should treat it as binding
until ADR-0008 is Accepted. `ACTIVE_TASK.md` is idle.

## Next

No B2 work remains. Most of what's left needs a human decision — see "Blocked
on human decisions". The exceptions, which an agent can pick up unblocked, are
under "Known gaps and debt": property-based tests, and growing content
volume within the mechanics that already exist.

**Three balance findings are waiting on a PM decision** (measured, see
`docs/design/economy.md`): the 500-coin stage-3 gate is cleared by the
starting energy bar before the tutorial ends; `order.water_delivery` is
strictly dominated by `order.first_sample` and is never worth delivering; and
the 7×9 board peaks at 4 of 63 cells in use.

**The integrity audit is closed.** All six findings landed (PRs #26, #27,
#28 and progressive board unlocking). The board now opens a section at a
time, on the same fixed 7×9 grid — dimensions never changed, so canon §57's
approval gate was never crossed. Canon §39's _recommended schedule_ is keyed
to campaign levels and is not implemented; the shipped sections gate on lab
stages instead. See ADR-0011.

## System coverage

| Area                 | Status                | Note                                                                 |
| -------------------- | --------------------- | -------------------------------------------------------------------- |
| Board                | Done                  | 7×9 fixed; opens by section, canon §39 (ADR-0011)                    |
| Items / registry     | Done                  | 2 items, one chain (Water → Steam) — thin content, not thin code     |
| Merge                | Done                  | Atomic, emits `ITEM_MERGED`                                          |
| Generators           | Done                  | 1 generator defined                                                  |
| Energy               | Done                  | Clock-driven regen, 1/60 per second                                  |
| Economy              | Done                  | Sole currency mutator                                                |
| Orders               | Done                  | 2 orders defined                                                     |
| Progression          | Done                  | XP curve, lab stages, chapter unlocks                                |
| Quests               | Done                  | 3 quests; conditions are shared `ProgressionRequirement`s (ADR-0007) |
| Dialogue / narrative | Done                  | 5 dialogues; two voices (`narrator`, `professor`)                    |
| Tutorial             | Done                  | Event-gated steps, full run verified in browser                      |
| Save                 | Done                  | Zod-validated on load, backup slot, `clear()`                        |
| UI                   | Done, placeholder art | Rarity-tinted rectangles, no sprites                                 |
| Analytics            | Wired, no vendor      | `NoopAnalyticsAdapter` by default                                    |
| Monetization         | Wired, no vendor      | Flags default-off; `Noop` ads/billing                                |
| Web / PWA            | Done, not a release   | Shared bundle + dev/QA surface; offline boot verified by hand        |
| Android              | Builds in CI          | The release target; `assembleDebug` green, never booted on a device  |
| iOS                  | Not planned           | Kept reachable, not committed — ADR-0005                             |

## Verification status

- 241 unit + integration tests (Vitest), 38 files — green; coverage 95%
  statements / 94% branches, now gated in CI by a threshold ratchet.
- 2 Playwright e2e tests — green (functional smoke + screenshot capture).
- CI: `build`, `e2e`, `android`, `security` — all green on `main`, last
  verified on PR #32. The unit-test job runs `pnpm test:coverage`, so a
  coverage regression now fails the build. Actions stopped triggering for ~4 hours on 2026-08-26
  and has since recovered; PR #22 merged during that window without a CI run.
- Last full pipeline pass: PR #32, 2026-08-27.

## Blocked on human decisions

Each needs an ADR before implementation, per `AI_RULES.md`:

- **Retune `LevelCurve`?** Merge XP (ADR-0009) raised total XP by 40% over a
  15-hour optimal run, moving the player from level 5 to 6. The quadratic
  curve absorbed it, so nothing is broken — but the curve has never been
  tuned against a measurement, and now there is one.
- **First-discovery and quest XP.** Canon §5 lists both; neither is wired.
  Discovery XP would need either a second content field or a ruling that
  reusing `xpValue` (and so double-paying the first merge of each item) is
  intended. Quests have no XP reward field at all.
- **Mechanic design pipeline (ADR-0008).** Which route to take, not just
  whether: rules-only (classification in `AI_RULES.md`), the full spec catalog
  proposed here, chapter beat sheets first, machine-checked specs, or a
  MASTER_SPEC index. ADR-0008's ALTERNATIVES lists all of them with what each
  costs and buys; several are complementary rather than exclusive. Also open:
  the pipeline's section number, where the proposed numbering conflicts with
  `CONTEXT_MAP.md`.
- **Analytics vendor.** The A24 event vocabulary is implemented; nothing is
  sent anywhere. Picking a vendor is a data-processing decision.
- **Ad network and billing vendor**, plus the rewards and IAP catalog.
  `MonetizationService` deliberately does not decide what a reward grants.
- **iOS.** Not planned (ADR-0005). Starting it needs a PM decision plus an
  environment with Xcode/macOS — nothing here can build or verify it today.
  The constraints that keep it cheap are in ADR-0005 and are binding now.
- **Pixel-diff visual regression.** Currently screenshots are captured for
  human review, not compared — see ADR-0002 for what would change that.
- **Real art and audio.** Items render as placeholder tiles.
- **Canon §4 cannot express canon §10's board-unlock requirement.** Level 4
  requires "UNLOCK first board section", but §4's `ProgressionRequirement`
  union has no such type. Reported by ADR-0011, not resolved — the same shape
  as the open `SPEND_ENERGY` conflict.
- **Board section costs and sizes.** 40/300/800 coins over a 21-cell starter
  area is a first pass. It produces no board pressure (peak use is 4 cells),
  which canon §10 wants as a Level 4 beat — that needs content volume, not a
  smaller starter. Now measurable via `pnpm economy:simulate`.
- **State is never reconciled on load.** Quests and chapters advance only on
  live event _transitions_, so content added after a player already passed
  its condition can never complete. Fixing it means deciding whether such a
  quest should pay out retroactively — a design call, not a bug fix, so it
  is reported rather than implemented.
- **Temporary events.** The save's `EventSave` slot exists and round-trips; no
  system consumes it, and there is no content format. The empty
  `content/events/` directory that used to sit beside it is gone — it implied
  a wiring that never existed. Designing the mechanic brings both back.
- **Content volume.** The systems are done but the game is small: 2 items
  (one merge chain), 1 generator, 2 orders, 3 quests, 2 chapters, 5 dialogues.

## Known gaps and debt

- **The campaign canon landed and most of it is unbuilt.** Audited in
  `docs/design/campaign-gap-analysis.md` — read that before planning any
  campaign work. Summary: the engine canon assumes is largely built and holds
  up; the campaign layer that turns it into a game is almost entirely absent.
  There is no `CampaignLevelDefinition`, no level completion, no research
  system, no board-cell unlocking, no narrative beats, and 10 of canon's 12
  required domain events are missing. Three of the six reported conflicts are
  now decided (ADR-0007, ADR-0009, ADR-0010); the other three still need a PM
  decision before building. A 10-step build order is proposed at the end of
  that document.
- The canon is numbered §0–§60 by level and topic; the `A5`/`A16`/`B2`
  references in the docs and in source comments came from an earlier spec
  revision and do not resolve against it. Reconciling them is unfinished.
  Canon §57's approval list also supersedes — and is stricter than — the
  stop-list in `AI_RULES.md`.
- `tests/property/` exists but is empty — no property-based tests despite the
  deterministic-state invariant being a natural fit.
- `tools/save-migrator/` is an empty placeholder. It matters as soon as a
  `SaveDataV2` exists.
- ~~`tests/e2e/smoke.spec.ts` duplicated `BoardView`'s layout math~~ — fixed:
  the constants live in `src/presentation/layout.ts` (import-free so the test
  can reach them) and the viewport comes from `page.viewportSize()`.
- No save migration path has been exercised — `SaveDataV1` is still v1.

## Recent decisions

- Architecture + code review (two passes, see the PR for the merged
  findings). Nine items fixed; three left as decisions: load-time state
  reconciliation, the `A5`/`B2` doc-numbering reconciliation, and canon §4's
  missing board-unlock requirement type.
- ADR-0011: the board opens progressively by section, per canon §39, on the
  unchanged 7×9 grid. Cell state stays the only record of what is unlocked —
  no new save field. Measured: identical coins earned, level and peak board
  use; the only change is a new coin sink worth ~3 hours of lab progression.
- ADR-0010: chapter ids stay order-free (`chapter.basement`); the campaign
  ordinal is canon §30's `chapterNumber` field, validated unique and
  contiguous. Closes gap-analysis conflict #3 with no save migration; canon's
  `chapter_01_*` naming example is a reported divergence.
- ADR-0008 (**Proposed**, not accepted): mechanic design pipeline.
- ADR-0005: Android is the release target; the web build is the shared bundle
  rather than a separate release, and iOS is kept reachable but not planned.
  Amends ADR-0003's roadmap assumption.
- ADR-0004: this AI memory layer.
- ADR-0003: Capacitor for Android; `appId` is a placeholder pending a real
  product decision.
- ADR-0002: Playwright captures screenshots for review; no pixel baseline yet.
- ADR-0001: pnpm, Node 22, Zod validation at both build and load time, and a
  client-only trust boundary (saves are validated, not protected from their
  own player).
- PRs merge with a **merge commit**, never squash — squashing broke branch
  ancestry mid-project and produced phantom conflicts on the next PR.
