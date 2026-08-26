```text
ADR-ID: 0006
TITLE: Land the canonical save shape before the systems that fill it
STATUS: Accepted
CONTEXT:
  The campaign canon (MASTER_SPEC §32) specifies progression state the
  implementation does not have: which levels have paid out, which content
  ids have been applied, which research nodes were bought. The systems
  that would write those fields are several PRs away — the gap analysis
  puts them at steps 3 and 7 of a ten-step build order.
  The ordering matters because of an asymmetry this project already
  documented in data-contracts.md: while SaveDataV1 is unreleased, adding
  a field with `.default([])` is free — an older payload still parses and
  gets an empty array. Once v1 ships, the same field is a SaveDataV2, a
  migration in tools/save-migrator/ (still an empty placeholder), and a
  test that loads a real v1 payload.
  So the cost of these fields only ever goes up, and it steps up sharply
  at a date nobody has set yet. Every other item in the campaign plan is
  cost-flat: writing CampaignSystem in three PRs' time costs what it costs
  today.
DECISION:
  - Add the three canonical progression fields now, defaulted to empty,
    with no system reading or writing them:
      completedLevelIds          (canon §32, reward idempotency)
      unlockedContentIds         (canon §33, content unlock)
      purchasedResearchNodeIds   (canon §32/§42, research)
  - Do NOT add a field for board-cell unlocking. Canon §39 needs unlocked
    cells to persist, but BoardCellSave already carries a `state` that
    includes LOCKED — a cell being opened is an existing state transition,
    not new save data. Adding a parallel `unlockedCellIds` would give the
    same fact two homes and let them disagree.
  - Do NOT move `player.level` / `player.xp` into ProgressionSave. Canon
    §32 prefixes that shape with "Recommended", so it is guidance rather
    than contract, and the split is behaviourally identical — GameState
    already exposes both. Moving them is a field removal, which the
    documented rules put behind a version bump, and it buys nothing.
  - Fields written ahead of their systems get a comment saying so, and
    naming the canon section, so the next reader knows they are deliberate
    rather than dead.
ALTERNATIVES:
  - Add each field with the PR that needs it: rejected — that is the
    default and it is the expensive path. It spreads three free changes
    across three PRs, each of which may land after v1 ships, at which
    point each costs a migration instead.
  - Bump to SaveDataV2 now and put the whole canonical shape in: rejected
    as premature. A version bump earns nothing while v1 is unreleased, and
    it would exercise a migration path with no real payload to migrate —
    the first migration should be a real one.
  - Wait for the PM to decide the full campaign design first: rejected —
    these three fields are named by canon and are not design-sensitive.
    What varies is what writes them, not whether they exist.
CONSEQUENCES:
  - Three fields exist that nothing reads. This is the recognised cost:
    an unread field looks like dead code to a reviewer, which is why each
    carries a comment pointing at its canon section and at this ADR.
  - When CampaignSystem and the research system land, they add behaviour
    without touching the save schema — so those PRs stay reviewable as
    logic changes rather than mixed schema-plus-logic changes.
  - The window this ADR exploits closes on release. After v1 ships, the
    documented rules apply unchanged and no further field is free.
  - `tools/save-migrator/` stays empty, and the project still has no
    exercised migration path. That debt is unchanged by this ADR and is
    listed in CURRENT_STATE.
MIGRATION:
  None. Existing saves parse unchanged and receive empty arrays for the
  three new fields — which is exactly what the defaults are for.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-26
```
