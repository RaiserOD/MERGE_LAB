```text
ADR-ID: 0011
TITLE: Progressive board unlocking, per canon §39
STATUS: Accepted
CONTEXT:
  Canon §39 keeps the board at 7×9 = 63 cells for the whole 20-level
  campaign — "the board does not physically change dimensions" and "the
  coordinate system never changes" — and instead makes cells "become
  available progressively". Canon §10 (Level 4, "The Locked Room")
  introduces locked cells, unlock conditions and board-space pressure as
  a gameplay beat, with "UNLOCK first board section" as a required action.
  §39 closes with "exact cell IDs and coin costs are content data".
  The implementation opened all 63 cells from the first launch.
  `BoardCellSave.state` already carried a LOCKED value that nothing ever
  set, and `Board.isEmpty` already treated a non-EMPTY cell as unusable,
  so the guards existed and only the mechanism was missing. The campaign
  gap analysis listed this as conflict #6; the PM ruled: implement it,
  per canon.
DECISION:
  - Cells are grouped into board *sections*, authored in
    `content/board-sections/*.json` and validated as an exact partition
    of the grid: every cell belongs to one section, none to two, and
    `sectionNumber` runs 1..N without gaps (the ADR-0010 rule).
  - Section 1 is the starter area by definition. A new board opens
    exactly its cells, so the starting state is derivable from content
    without evaluating a single condition. The validator rejects a
    starter section that carries conditions or a non-zero cost.
  - `BoardExpansionSystem` owns the unlock: validate fully, then spend,
    then mutate, then emit — the same atomic shape as merge and the lab
    upgrade. Coins go through `EconomySystem`, as the invariant requires.
  - **Cell state is the single source of truth for what is unlocked.** No
    new save field. `BoardCellSave.state` already persists per cell, and
    a parallel `unlockedSectionIds` list would give one fact two homes
    that could disagree.
  - Unlock conditions reuse the chapter vocabulary ("labStage>=N",
    "playerLevel>=N", "chapterUnlocked:<id>"). The evaluator moved into
    the domain as `UnlockCondition.ts`, because it now has three callers:
    ProgressionSystem, BoardExpansionSystem, and the content validator —
    which had been carrying its own copy of the same patterns.
  - `BOARD_SECTION_UNLOCKED` is a new domain event. `AnalyticsBridge`
    maps it to `content_unlocked`, which canon §48 requires and nothing
    previously produced.
  - Board dimensions are untouched: still 7×9, still `runtimeConfig`.
    Canon §57 puts dimensions on the approval list; this changes what is
    *reachable*, never how many cells exist.
ALTERNATIVES:
  - Ship canon §39's exact schedule (Level 1 starter, 2 first expansion,
    4 first locked section, 6 chemistry, 9 biology, 13 robotics, 17
    advanced, 20 final): NOT done, deliberately. Those are *campaign*
    levels, and the campaign-level layer does not exist — there is no
    CampaignLevelDefinition and no level completion. Mapping campaign
    level onto `playerLevel` would be exactly the silent reconciliation
    `AI_RULES.md` forbids. Four sections ship instead, gated on lab
    stages, which are real. See the conflict note below.
  - A separate `unlockedSectionIds` save field: rejected — see above.
    Cell state already persists and is already respected everywhere.
  - Deriving locks on load from content instead of the save: rejected.
    It would silently re-lock cells a player had bought whenever content
    changed, and there is no record of what they paid for.
  - Teaching BoardSystem/MergeSystem about LOCKED: unnecessary. Both go
    through `Board.isEmpty`, which is state === "EMPTY", so a locked cell
    was already an invalid target. The integration test pins this.
  - Making the starter section explicit with a boolean flag rather than
    sectionNumber 1: rejected — a flag that must be true exactly once is
    a constraint the ordinal already expresses.
CONSEQUENCES:
  - Measured with `pnpm economy:simulate`, same options before and after.
    Identical: coins earned (9645), final level (7 at 2688 XP), peak
    board use (4 cells), and boardFull blocks (0). Changed: coins spent
    4725 → 5865, exactly the three section costs, and lab stage 5 arrives
    at 13.9h instead of 10.9h. Board expansion is a coin sink worth about
    three hours of lab progression in an optimal run.
  - It creates no board *pressure* yet, and cannot: peak usage is 4 cells
    against a 21-cell starter area. Canon §10 wants pressure as a Level 4
    beat; that needs content volume, not a smaller starter. The section
    costs (40/300/800) are a first pass and are now measurable — a
    balance decision the PM can revisit against numbers.
  - Saves written before this change have all 63 cells EMPTY and stay
    fully open. That is deliberate: never take away cells a player
    already has. `SaveDataV1` is unreleased, so no real player is in that
    state.
  - The content validator gained a partition check. Adding a section
    means re-partitioning; a forgotten cell now fails the build instead
    of becoming permanently unreachable.
CONFLICT REPORTED, NOT RESOLVED:
  Canon §4's ProgressionRequirement union has no board-unlock type, yet
  canon §10 makes "UNLOCK first board section" a required action for
  Level 4. Canon cannot express its own level-4 requirement. This is the
  same shape as the open SPEND_ENERGY conflict (gap analysis #2) and is
  left for the PM: either §4's list is incomplete, or Level 4's action
  maps onto something else. Nothing here guesses which.
MIGRATION:
  None. No save field added, changed or removed; `BoardCellSave.state`
  already accepted LOCKED. Existing saves load unchanged.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-26
```
