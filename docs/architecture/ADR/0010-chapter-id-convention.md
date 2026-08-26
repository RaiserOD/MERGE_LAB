```text
ADR-ID: 0010
TITLE: Chapter ids stay order-free; the campaign ordinal is chapterNumber
STATUS: Accepted
CONTEXT:
  Canon §30 defines a chapter as carrying a `chapterNumber: number` field
  and, in the same section, names chapters `chapter_01_basement`. The
  repository's content uses `chapter.basement` / `chapter.chemistry`, the
  dot-namespaced convention every other content id in this project follows
  (`item.water`, `gen.water_tap`, `order.first_sample`).
  The campaign gap analysis reported this as conflict #3 and did not
  resolve it, because chapter ids are persisted: `unlockedChapterIds` in
  ProgressionSave records them, so renaming them is a save-migration
  event under `data-contracts.md`, not a refactor.
  Two facts made the decision cheap rather than balanced:
  the ordinal is already a field, and ids in saves cannot be corrected
  later without a migration.
DECISION:
  - Chapter ids keep the project convention and stay free of ordering
    information: `chapter.basement`, not `chapter_01_basement`.
  - The campaign position is adopted from canon §30 as a real field:
    `chapterNumber: z.number().int().positive()` on
    ChapterDefinition. It is required, not optional — every chapter has a
    position, and a default would let content omit the one thing the
    field exists to state.
  - The content validator enforces that chapter numbers are unique and
    run 1..N with no gaps. Uniqueness makes the number usable as an
    ordering key; contiguity catches a chapter that was deleted or
    renumbered halfway.
  - No save migration. `unlockedChapterIds` keeps recording the same
    strings it records today.
  - The divergence from canon's *naming example* is reported upward as a
    proposed canon amendment, not resolved silently. Canon's field is
    adopted in full; only the id spelling in its example differs.
ALTERNATIVES:
  - Rename ids to `chapter_01_basement` to match canon exactly: rejected.
    It stores the ordinal twice — once as data in `chapterNumber`, once
    inside a persisted identifier — and the persisted copy is the one
    that cannot be corrected. Reordering the campaign (canon has 5
    chapters over 20 levels, and the campaign is largely unbuilt) would
    then either produce ids that lie about their position or force a
    SaveDataV2 migration for a cosmetic reason. It also costs the
    migration now, before there is any second chapter set to migrate.
  - Rename ids and drop `chapterNumber`, deriving the position by parsing
    the id: rejected. Parsing meaning out of identifiers is how ids stop
    being opaque; the sort order of the campaign would then depend on a
    regex over save data.
  - Leave `chapterNumber` out and order chapters by array position in the
    loaded content: rejected. Content files load from a directory glob —
    the order is filesystem-dependent, and canon specifies the field
    precisely so ordering does not rest on that.
  - Make `chapterNumber` optional with a default: rejected. Every chapter
    has a position; an absent one is a content bug, and the validator
    should say so rather than invent a 1.
CONSEQUENCES:
  - `content/chapters/basement.json` is chapterNumber 1,
    `chemistry.json` is 2. Both were already in that order implicitly via
    `labStage` and `unlockConditions`; now it is stated.
  - Campaign work (CampaignLevelDefinition, `firstLevel`/`lastLevel`,
    narrative beats) has an ordering key to hang off, which was the
    reason canon specified the field.
  - Adding a chapter between two existing ones renumbers the ones after
    it. That is a content edit, caught by the validator if done
    incompletely, and touches no save data — which is the point.
  - Conflict #3 in `docs/design/campaign-gap-analysis.md` is closed by
    decision. Canon's `chapter_01_*` example remains a reported
    divergence for the PM to amend or overrule.
MIGRATION:
  None. No persisted string changed. `chapterNumber` is a content field,
  not a save field, so no SaveDataV1 change and no migration path.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-26
```
