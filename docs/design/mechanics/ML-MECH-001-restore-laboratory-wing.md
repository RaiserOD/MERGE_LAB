# ML-MECH-001 — Restore Laboratory Wing

```text
MECHANIC_ID:  ML-MECH-001
CLASS:        M3
STATUS:       LIVE (retro-documented)
CHAPTER:      chapter.basement onwards
ADR:          none
SUPERSEDES:   none
APPROVED_BY:  shipped before this pipeline existed
DATE:         2026-08-26 (documented), implemented in `4468e84`
```

> **Retro-documentation.** This describes a mechanic that already ships, to
> show the format against real code rather than an invented example. It does
> not re-open a decision and it is not a change request. Where this page and
> the code disagree, the code is right and this page is a bug.

## 1. Intent

PURPOSE — give the player a long-horizon goal that consumes the coins orders
produce, so the session loop closes.
PLAYER_FANTASY — bringing an abandoned laboratory back to life, wing by wing.
PILLARS — restoration; short satisfying actions.

## 2. Narrative context

STORY_PURPOSE — the meta-progression the premise promises: the lab "was yours
before it was mine", and restoring it is the reason to keep playing.
TRIGGER — enough coins, plus the tutorial pointing at it.
REVEALS — each stage has a title; new chapters unlock behind stage thresholds.
VOICES — `professor` (`tutorial.first_upgrade` carries a Professor line).

## 3. Player action

VERB — restore.
INPUT — coins.
TARGET — the next lab stage.
WHERE — the lab upgrade button in the HUD.

## 4. Rules

PRECONDITIONS

- a stage `current + 1` exists in `content/lab-stages/stages.json`;
- the player can afford its `upgradeCost` in coins.

ON_SUCCESS — `ProgressionSystem.upgradeLab()` spends the coins through
`EconomySystem.spend()`, advances `progression.labStage`, then emits
`LAB_UPGRADED { newStage, title, coinCost }`. Validate fully, then mutate,
then emit.

ON_FAILURE — throws `ProgressionError` **without mutating**, separately for
"already at the highest stage" and "need N coins, only M available".

LIMITS — one stage at a time; five stages defined; no downgrade.

## 5. Feedback

VISUAL / AUDIO — none beyond the HUD updating. Placeholder art throughout.
UI — stage title and coin balance update.
NARRATIVE — the tutorial's fourth step completes on `LAB_UPGRADED`.

## 6. Economy

CONSUMES — coins.
GRANTS — lab stage; chapter unlocks evaluated afterwards.
FAUCET_OR_SINK — the only coin **sink** in the game.
NUMBERS — stage 2: 25 coins (rebalanced down in `34224ac` so the first repair
lands inside the tutorial), then 500 / 1200 / 3000. Stage 2 is tuned; 3–5 are
**guesses** — no economy simulation exists behind them (`economy.md`).

## 7. Progression

UNLOCKED_BY — nothing; available from the start.
UNLOCKS — `chapter.chemistry` at `labStage>=2`; further stages have no
content behind them yet.
LATER — lab stages are the natural gate for future chapter content.

## 8. Architecture contract

SYSTEM — `ProgressionSystem` (existing).
METHOD — `upgradeLab()`, plus `canUpgradeLab()` for the button's enabled state.
EVENTS — `LAB_UPGRADED` (existing variant).
OBSERVERS — `TutorialSystem` (`tutorial.first_upgrade`), `AnalyticsBridge`
(`lab_upgraded`). Neither depends on the other's ordering.
DOMAIN_STATE — `progression.labStage`.
PERSISTENT_STATE — `SaveDataV1.progression.labStage` (int, non-negative) and
`unlockedChapterIds`.
CONTENT — `content/lab-stages/stages.json`, `LabStageDefinition`; the
validator requires an unbroken `1..N` run.
FLAGS — none.
MIGRATION — none; shipped inside v1.

## 9. Presentation

A HUD button (`34224ac`). Scene dispatches to `ProgressionSystem`; no
gameplay logic in the view.

## 10. Analytics

EVENTS — `lab_upgraded { newStage }`, emitted only via `AnalyticsBridge`.
SUCCESS_METRIC — share of players reaching stage 2 inside the tutorial.
FAILURE_METRIC — players stalled below stage 3 — the untuned 500-coin step.

## 11. Acceptance criteria

PLAYER — with enough coins, restoring advances the stage and unlocks the next
chapter where one is gated on it.
SYSTEM — unaffordable or maxed-out upgrades throw without mutating state;
coins move only through `EconomySystem`.
SAVE — stage and unlocked chapters survive reload (`acceptance.md` step 6).
TESTS — `tests/unit/ProgressionSystem.test.ts`; the manual playable
acceptance run, step 5.

## 12. Non-requirements

No downgrade, no partial repair, no per-wing sub-tasks, no gem cost, no
timers. Stages 3–5 unlock nothing today; adding content behind them is
content work, not a change to this mechanic.

## 13. Open questions

- The 500 / 1200 / 3000 curve is unvalidated against any faucet rate.
- Research points still have no sink; a research-gated stage is an obvious
  candidate, and an unmade decision.
