# CURRENT STATE

Working memory: what exists, what is in flight, what is next. This is a
journal, not documentation — it goes stale the moment work lands without
updating it, and a stale entry here is worse than no entry, because agents
trust it.

**Updated:** 2026-08-26
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

## In progress

Nothing. `ACTIVE_TASK.md` is idle.

## Next

No B2 work remains. Everything below needs a human decision before an agent
should start it — see "Blocked on human decisions".

## System coverage

| Area                 | Status                | Note                                                                |
| -------------------- | --------------------- | ------------------------------------------------------------------- |
| Board                | Done                  | 7×9 fixed, `runtimeConfig`                                          |
| Items / registry     | Done                  | 2 items, one chain (Water → Steam) — thin content, not thin code    |
| Merge                | Done                  | Atomic, emits `ITEM_MERGED`                                         |
| Generators           | Done                  | 1 generator defined                                                 |
| Energy               | Done                  | Clock-driven regen, 1/60 per second                                 |
| Economy              | Done                  | Sole currency mutator                                               |
| Orders               | Done                  | 2 orders defined                                                    |
| Progression          | Done                  | XP curve, lab stages, chapter unlocks                               |
| Quests               | Done                  | 3 quests defined                                                    |
| Dialogue / narrative | Done                  | 5 dialogues; two voices (`narrator`, `professor`)                   |
| Tutorial             | Done                  | Event-gated steps, full run verified in browser                     |
| Save                 | Done                  | Zod-validated on load, backup slot, `clear()`                       |
| UI                   | Done, placeholder art | Rarity-tinted rectangles, no sprites                                |
| Analytics            | Wired, no vendor      | `NoopAnalyticsAdapter` by default                                   |
| Monetization         | Wired, no vendor      | Flags default-off; `Noop` ads/billing                               |
| Web / PWA            | Done, not a release   | Shared bundle + dev/QA surface; offline boot verified by hand       |
| Android              | Builds in CI          | The release target; `assembleDebug` green, never booted on a device |
| iOS                  | Not planned           | Kept reachable, not committed — ADR-0005                            |

## Verification status

- 165 unit + integration tests (Vitest), 28 files — green.
- 2 Playwright e2e tests — green (functional smoke + screenshot capture).
- CI: `build`, `e2e`, `android`, `security` — all green on `main`.
- Last full pipeline pass: PR #16, 2026-08-26.

## Blocked on human decisions

Each needs an ADR before implementation, per `AI_RULES.md`:

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
- **Temporary events.** `content/events/` and the `EventSave` slot exist and
  round-trip; no system consumes them.
- **Content volume.** The systems are done but the game is small: 2 items
  (one merge chain), 1 generator, 2 orders, 3 quests, 2 chapters, 5 dialogues.

## Known gaps and debt

- `docs/MASTER_SPEC.md` is absent from the repo, so the top of the
  source-of-truth precedence chain is unavailable to agents and the section
  references in `CONTEXT_MAP.md` don't resolve.
- `tests/property/` exists but is empty — no property-based tests despite the
  deterministic-state invariant being a natural fit.
- `tools/economy-simulator/` and `tools/save-migrator/` are empty
  placeholders. The migrator matters as soon as a `SaveDataV2` exists.
- `tests/e2e/smoke.spec.ts` duplicates `BoardView`'s layout math inline to
  compute cell centers; a layout change in the view silently desyncs it.
- No save migration path has been exercised — `SaveDataV1` is still v1.

## Recent decisions

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
