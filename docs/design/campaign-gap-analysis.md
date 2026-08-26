# Campaign canon vs. implementation — gap analysis

`docs/MASTER_SPEC.md` ("MERGE LAB — 20-LEVEL CAMPAIGN CANON" v1.0) landed in
commit `e9efdaf`. It is an implementation contract for player levels 1–20.
This page audits it against what the repository actually contains, section by
section, so the work can be planned instead of discovered.

**Method:** every claim below was checked against the source, not from memory.
Where canon and code disagree, the disagreement is reported rather than
resolved — that is `AI_RULES.md`'s rule and it applies to the PM, not to an
agent.

**Headline:** the _engine_ canon assumes is largely built and holds up well.
The _campaign_ canon specifies — the thing that turns systems into a game — is
almost entirely absent. Roughly: mechanics 70% there, campaign 5%.

---

## 1. What canon can build on today

Worth stating first, because it determines how much of the rest is additive
rather than rework:

| Canon requires                                             | Status                                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| One persistent simulation, levels are data not scenes (§0) | **Holds.** One `GameScene`; no per-level scenes exist to unpick                                                                 |
| Domain independent of Phaser (§0)                          | **Holds**, ESLint-enforced                                                                                                      |
| Atomic, deterministic state changes (§3, §31)              | **Holds.** Merge/order/generator all validate → mutate → emit                                                                   |
| Content is data (§60)                                      | **Holds.** Zod schemas + `import.meta.glob` + validator                                                                         |
| Requirements satisfied by domain state, not UI (§4)        | **Holds.** `QuestSystem` is already event-driven                                                                                |
| Narrative reacts to events, never mutates gameplay (§29)   | **Holds.** `DialogueSystem` is already shaped this way                                                                          |
| Balance from economy simulation (§28)                      | **Holds.** `pnpm economy:simulate`                                                                                              |
| Board stays 7×9, coordinates never change (§39)            | **Holds.** `runtimeConfig`, and `BoardCell` already has a `LOCKED` state                                                        |
| Five lab stages ↔ five acts (§6, §30)                      | **Aligns.** `content/lab-stages/stages.json` has exactly 5, named Basement / Chemistry / Biology / Robotics / Advanced Research |

That last one is a real piece of luck: the lab-stage ladder already built
matches canon's five-act structure one-to-one.

---

## 2. The central gap: there is no campaign layer

Canon's core artefact is `CampaignLevelDefinition` (§28) — the thing that makes
a level a level:

```ts
interface CampaignLevelDefinition {
  id: string;
  level: number;
  xpRequiredTotal: number;
  chapterId: string;
  labStage: number;
  unlocks: string[];
  requirements: ProgressionRequirement[];
  activeOrderPoolId: string;
  questPoolId: string;
  narrativeBeatId: string;
  rewards: RewardDefinition[];
  completionDialogueId?: string;
  nextLevelDialogueId?: string;
}
```

**Nothing in the repository corresponds to this.** There is no level content,
no level registry, no level system, no level events. `ProgressionSystem` grants
XP and derives a level number from `LevelCurve`, and that is the whole of
"levels" today. Canon's entire §31 unlock algorithm — evaluate requirements,
grant rewards exactly once, unlock content, emit, save — does not exist.

Everything else in this document is downstream of that.

---

## 3. Section-by-section gaps

### Progression and levels

| §   | Canon                                                | Reality                                                             |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 2   | `PlayerLevelDefinition` as content                   | Absent. XP thresholds are a hard-coded quadratic in `LevelCurve.ts` |
| 3   | Atomic level completion, `LEVEL_COMPLETED`           | Absent                                                              |
| 4   | 10 `ProgressionRequirement` types                    | 6 of 10 exist as _quest_ types; see below                           |
| 5   | XP from merges, discoveries, orders, quests, rewards | **Conflict — see §5 below**                                         |
| 31  | Level unlock algorithm                               | Absent                                                              |
| 32  | Reward idempotency, `completedLevelIds`              | Absent. Nothing records a claimed reward                            |
| 33  | Data-driven content unlock                           | Absent. `unlocks[]` has no consumer                                 |

**Requirement-type overlap.** Canon's `ProgressionRequirement` and the existing
`QuestDefinition` union are different contracts that happen to share most of
their vocabulary:

- Shared, same shape (6): `MERGE_COUNT`, `DISCOVER_ITEM`, `COMPLETE_ORDER`,
  `EARN_COINS`, `UPGRADE_LAB`, `USE_GENERATOR`
- Canon-only (4): `COMPLETE_ORDERS`, `UNLOCK_RESEARCH`, `DISCOVERIES_COUNT`,
  `COMPLETE_QUEST`
- Code-only (1): `SPEND_ENERGY` — which canon omits from §4 but _requires_ in
  Level 3's actions ("SPEND configured amount of Energy"). Flagged below.

The 6 shared ones are already evaluated event-wise by `QuestSystem`, so the
evaluator is largely reusable — the question is whether requirements and quests
share one predicate type or stay separate. That's an architecture decision, so
it needs an ADR.

### Chapters

Canon §30 wants `chapterNumber`, `firstLevel`, `lastLevel`, `researchNodeIds`,
`narrativeBeatIds`. The existing schema has `unlockConditions`, `dialogueIds`,
`availableItemGroups`, `availableGenerators`, `labStage`, and — already —
optional `orderPoolId` / `questPoolId`.

Overlapping but not the same. Also an **ID convention mismatch**: content uses
`chapter.basement`, canon writes `chapter_01_basement`. Chapter IDs are
persisted in `unlockedChapterIds`, so per `data-contracts.md` a rename is a
save-migration event, not a refactor.

Only 2 of 5 chapters exist (`basement`, `chemistry`).

### Research — entirely absent

Canon introduces Research at Level 5 (§11) as a progression currency with a
node tree (§42: Chemistry/Biology/Robotics/Advanced, three nodes each, DAG, no
cycles), an `UNLOCK_RESEARCH` requirement, and `purchasedResearchNodeIds` in
the save.

The repository has a `researchPoints` **currency** — granted by orders and
quests, spent by nothing — and no research system, nodes, tree, or UI. The
currency without the tree is why research points currently have no sink.

This is the single largest new system canon requires.

### Board cell unlocking — absent

Canon §39: the board stays 7×9 and cells become available progressively, at
levels 1, 2, 4, 6, 9, 13, 17, 20, with cell IDs and coin costs as content.

`BoardCell` already models a `LOCKED` state, so the domain supports it. Nothing
sets it, nothing unlocks it, and no content defines which cells or what they
cost. Every new game currently starts with all 63 cells open — which is also
why the economy simulator finds peak occupancy of 4/63: canon never intended
the whole board to be available.

### Narrative beats — absent

Canon §29 wants `NarrativeBeatDefinition` with a trigger enum
(`LEVEL_STARTED`, `LEVEL_COMPLETED`, `ITEM_DISCOVERED`, `ORDER_COMPLETED`,
`ANOMALY_DETECTED`, `LAB_UPGRADED`), an optional condition, a dialogue id, and
`once`.

Dialogues exist and are triggered declaratively from chapters and tutorial
steps. Beats — the layer that binds a story moment to an arbitrary domain event
— do not. The mechanism is close to what `DialogueSystem` already does, so this
is a small system, not a large one.

### Anomaly and experiment systems — absent

Levels 18–19 (§24, §25) introduce a deterministic anomaly trigger and an
"Experimental Merge" / experiment completion. Neither exists. Canon is explicit
that the anomaly is deterministic and that no random result occurs (§50) —
worth holding onto, because "anomaly" invites a random implementation.

### Events

Canon §47 requires 12 events. Present today: `CHAPTER_UNLOCKED` and
`ITEM_DISCOVERED` are near-matches for `CHAPTER_STARTED` and
`DISCOVERY_COMPLETED` but not the same names. The other 10 are absent:
`LEVEL_STARTED`, `LEVEL_COMPLETED`, `CONTENT_UNLOCKED`, `CHAPTER_COMPLETED`,
`NARRATIVE_BEAT_STARTED`, `NARRATIVE_BEAT_COMPLETED`, `RESEARCH_UNLOCKED`,
`ANOMALY_DETECTED`, `EXPERIMENT_COMPLETED`, `CAMPAIGN_COMPLETED`.

Adding event variants is additive and safe (`data-contracts.md`); renaming the
two near-matches is not, because `AnalyticsBridge`, `QuestSystem`,
`TutorialSystem` and `ProgressionSystem` all switch on them.

### Analytics

Canon §48 requires 11 event names. `AnalyticsEvent` has 17 today, of which only
`chapter_unlocked` is a near-match. The bridge pattern means this is
mechanical work once the domain events exist.

### Save schema — a version bump

Canon §32's `ProgressionSave` and the implemented one:

| Canon                      | Implemented                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `playerLevel`, `xp`        | in `PlayerSave` instead                                                                  |
| `completedLevelIds`        | absent                                                                                   |
| `unlockedContentIds`       | absent                                                                                   |
| `purchasedResearchNodeIds` | absent                                                                                   |
| `labStage`                 | present                                                                                  |
| —                          | `unlockedChapterIds`, `discoveredItemIds`, `seenDialogueIds`, `completedTutorialStepIds` |

Adding the three absent arrays with `.default([])` is safe **only while v1 is
unreleased**. Any reshaping beyond that (moving level/xp, renaming chapter IDs)
is `SaveDataV2` + a migration in `tools/save-migrator/` + a test that loads a
real v1 payload — and canon §57 lists "save schema" as requiring PM approval.

### Content volume

Canon needs 20 levels, 5 chapters, four item branches (Chemistry/Energy,
Biology, Robotics, Advanced), a generator per branch, order pools per act, and
a 12-node research tree.

Present: 2 items (Water → Steam), 1 generator, 2 orders, 3 quests, 2 chapters,
5 dialogues, 4 tutorial steps.

Canon names many items it does not define — Energy, Plasma, Exotic Matter,
Cell, Tissue, Organ, Lifeform, Artificial Life, Scrap, Circuit, Robot, Research
Android — as content to be authored, with chain lengths "content-defined".

---

## 4. Acceptance tests canon already specifies

§49–§55 give seven executable acceptance tests (levels 1, 8, 12, 16, 18, 19,
20). These are worth writing as integration tests **before** the systems they
describe, because they define done. The Level 1 test is currently unsatisfiable
for a mechanical reason: it asserts `player.level == 2` after the first order
and repair, and nothing advances a player level on requirements today.

---

## 5. Conflicts needing a PM decision

Per `AI_RULES.md` these are reported, not resolved.

1. **XP from merges.** Canon §5 lists merges and first discoveries as XP
   sources. The code grants XP only from `ORDER_COMPLETED.xpReward`.
   `ItemDefinition.xpValue` exists, is validated, and is read by nothing.
   Either the code is missing a faucet or canon over-specifies — but the
   economy simulation's numbers assume the current behaviour, so this changes
   pacing.
2. **`SPEND_ENERGY`.** Level 3 requires spending energy, but §4's
   `ProgressionRequirement` union has no such type. The code has it as a quest
   type. Either canon's list is incomplete or Level 3's action maps onto
   something else.
3. **Chapter ID convention.** `chapter.basement` (code) vs
   `chapter_01_basement` (canon §30). Persisted, so aligning them is a
   migration.
4. **Requirements vs quests.** Canon treats them as separate contracts that
   share 6 of 7 predicate shapes. One shared predicate type or two parallel
   ones is an architecture call — ADR required either way.
5. **Tutorial vs Level 1.** The implemented 4-step tutorial and canon's Level 1
   requirements describe the same opening beats through two different
   mechanisms. Whether the tutorial becomes Level 1's requirement set, or stays
   a parallel layer, is unresolved.
6. **Board starts fully open.** Canon expects progressive cell unlocking from
   Level 1. Changing this alters every existing balance measurement.

---

## 6. Suggested build order

Each step is a PR; each is useless without the one before it.

1. **Campaign level contract** — `CampaignLevelDefinition` schema, registry,
   loader, validator rules. Content for levels 1–4 only.
2. **`ProgressionRequirement` evaluator** — resolve conflict 4 first. Reuse
   `QuestSystem`'s event-driven evaluation.
3. **`CampaignSystem`** — §31's algorithm: evaluate, grant once, unlock, emit,
   save. Plus `LEVEL_STARTED` / `LEVEL_COMPLETED` / `CONTENT_UNLOCKED`.
   Save-schema additions land here (`completedLevelIds`, `unlockedContentIds`).
4. **Level 1 acceptance test** (§49) — green before anything else is built.
5. **Narrative beats** — small system, unblocks every level's story.
6. **Board cell unlocking** — content + system; re-run the economy simulator
   afterwards, since it changes the constraint the simulator currently reports.
7. **Research** — the large one. Nodes, DAG validation, purchase through
   `EconomySystem`, `UNLOCK_RESEARCH`. Gives `researchPoints` its sink.
8. **Acts II–V content** — item branches, generators, order/quest pools,
   chapters 3–5. Mostly authoring against the contracts above.
9. **Anomaly and experiment** — levels 18–19.
10. **Analytics + campaign completion** — §48 vocabulary, `CAMPAIGN_COMPLETED`.

Steps 1–4 are the spine: until a level can complete itself atomically and
exactly once, none of the content matters.

---

## 7. Section-numbering mismatch

Docs and source comments cite `A5`, `A8`, `A16`, `A21`–`A28`, `B2`, `B5`, `B9`.
Those come from an earlier spec revision and **do not resolve** against this
document, which is numbered §0–§60 by level and topic. The references are
currently topic pointers, not locations.

Canon §57's approval list is the successor to what the docs cite as B9, and it
is stricter — it adds `merge rules`, `core Energy rules` and `campaign
structure`. `AI_RULES.md`'s stop-list should be reconciled with it.
