# Data contracts

**This document points at contracts; it does not restate them.** Every schema
below lives in TypeScript as a Zod schema, which is what actually validates at
runtime. A copy in Markdown would drift within a sprint and then quietly
mislead — so the rule here is: read the schema file, and use this page to know
_which_ file and _what rules govern changing it_.

## Where each contract lives

| Contract         | Schema                                             | Content                             |
| ---------------- | -------------------------------------------------- | ----------------------------------- |
| Save data (v1)   | `src/domain/save/SaveDataV1.ts`                    | `localStorage`, key `mergeLab.save` |
| Items            | `src/domain/items/ItemDefinition.ts`               | `content/items/*.json`              |
| Generators       | `src/domain/generators/GeneratorDefinition.ts`     | `content/generators/*.json`         |
| Orders           | `src/domain/orders/OrderDefinition.ts`             | `content/orders/*.json`             |
| Quests           | `src/domain/quests/QuestDefinition.ts`             | `content/quests/*.json`             |
| Requirements     | `src/domain/progression/ProgressionRequirement.ts` | — (shared predicate, ADR-0007)      |
| Chapters         | `src/domain/progression/ChapterDefinition.ts`      | `content/chapters/*.json`           |
| Lab stages       | `src/domain/progression/LabStageDefinition.ts`     | `content/lab-stages/stages.json`    |
| Dialogues        | `src/domain/dialogues/DialogueDefinition.ts`       | `content/dialogues/*.json`          |
| Tutorial steps   | `src/domain/tutorial/TutorialStepDefinition.ts`    | `content/tutorial/steps.json`       |
| Domain events    | `src/systems/events/DomainEvent.ts`                | — (TypeScript union, not Zod)       |
| Analytics events | `src/infrastructure/analytics/AnalyticsEvent.ts`   | —                                   |
| Runtime config   | `src/config/runtime.ts`                            | —                                   |

Loading and registry construction: `src/infrastructure/content/ContentLoader.ts`.
Build-time validation: `tools/content-validator/` (`pnpm content:validate`).

The validator runs under `tsx`, which needs `--tsconfig tsconfig.app.json` to
resolve the `@domain/*` aliases — the root tsconfig is solution-style and
carries no `paths`. A schema file importing another schema file fails at
runtime without it, while still type-checking fine.

## Two validation gates

Content is validated **twice**, deliberately:

1. **Build time** — `pnpm content:validate` runs in CI and fails the build on
   malformed or referentially broken content. Authors get the error, not
   players.
2. **Load time** — the same schemas parse content and saves at runtime.

They are not redundant: build-time validation catches authoring mistakes,
load-time validation catches a _tampered or corrupted_ save. Removing either
is a real regression.

## The save contract

`SaveDataV1` is the only persisted shape, and it has two properties that
constrain every change to it:

- **It is untrusted input.** `localStorage` belongs to the player. Every load
  goes through the schema before it touches `GameState`; a save that fails
  validation is rejected rather than partially applied. Per ADR-0001, the MVP
  does _not_ defend against a player writing a schema-valid save that inflates
  their own coins — accepted risk, single-player, no leaderboards.
- **It is versioned.** The `version` field is part of the contract, not
  bookkeeping.

### Changing the save shape

| Change                                    | What's required                                      |
| ----------------------------------------- | ---------------------------------------------------- |
| Add an optional field with a `.default()` | Safe while v1 is unreleased; older saves still parse |
| Add a required field                      | Version bump + migration                             |
| Remove or rename a field                  | Version bump + migration                             |
| Change a field's type or meaning          | Version bump + migration                             |

A version bump means: a new `SaveDataV2` schema, a migration in
`tools/save-migrator/` (currently an empty placeholder), and tests that load a
real v1 payload and assert the v2 result. **Do not** silently widen v1 to mean
something new — that breaks saves in the field with no error message.

Several v1 fields (`discoveredItemIds`, `seenDialogueIds`,
`completedTutorialStepIds`) carry `.default([])` precisely because they were
added while v1 was still unreleased. Once v1 ships, that trick is no longer
available.

Three more (`completedLevelIds`, `unlockedContentIds`,
`purchasedResearchNodeIds`) were added ahead of the systems that will fill
them, deliberately, for the same reason — see ADR-0006. They are currently
written by nothing. That is not dead code to clean up: deleting one costs a
migration to restore.

Board-cell unlocking (canon §39) deliberately has **no** save field.
`BoardCellSave.state` already includes `LOCKED`, so opening a cell is an
existing state transition. A parallel `unlockedCellIds` would give the same
fact two homes and let them disagree.

When adding a save field, add it to `makeProgressionSave()` in
`tests/fixtures/testProgression.ts` too — tests build progression state
through that builder so a new field doesn't break every one of them.

## Content ID conventions

IDs are namespaced strings and are referenced across content files
(`chapter.basement`, `item.water`, and so on). They are part of the contract:
renaming an ID breaks saves that recorded it (`discoveredItemIds`,
`unlockedChapterIds`, `completedTutorialStepIds`, generator state). Treat an
ID rename as a save-migration event, not a refactor.

IDs carry no ordering information. A chapter's position in the campaign is
`chapterNumber`, a separate field, precisely so that reordering the campaign
never touches a persisted string (ADR-0010).

Cross-file references — an order requiring an item, a quest naming an order, a
chapter's unlock condition — are checked by the content validator. Adding a
new reference kind means teaching the validator about it in the same change.
So are within-file invariants that content alone can violate: chapter numbers
must be unique and run 1..N with no gaps.

## Domain events

`DomainEvent` is a plain discriminated union, not a Zod schema, because it
never crosses a trust boundary — it exists only in memory within one session.

It is still a contract: `AnalyticsBridge`, `QuestSystem`, `TutorialSystem` and
`ProgressionSystem` all switch on it. Adding a variant is additive and safe;
changing an existing variant's payload means auditing every observer listed in
`system-map.md`.

## Runtime config

`src/config/runtime.ts` ships in the client bundle and is fully visible to
players. Nothing secret goes there — no keys, no endpoints that assume
obscurity. Board dimensions live here (7×9) and are a documented invariant:
changing them needs approval and a save migration, since positions are
persisted.
