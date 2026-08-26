# Mechanic pipeline

**STATUS: Proposed.** Nothing below is binding until ADR-0008 is Accepted.
Until then this is a proposal for the human PM, not a rule agents follow.

Canon is `docs/MASTER_SPEC.md`, which is not in this repo yet — see the note
in `PROJECT_MEMORY.md`. This document describes a **process**, not the game.

`content-pipeline.md` answers "how does a JSON file become game content?".
This answers the question one level up: **how does an idea become an approved
mechanic that is safe to implement?**

## The gap this fills

`PROJECT_MEMORY.md` already says:

> Mechanics are never invented. If it isn't in the spec, an ADR, or existing
> code, it needs human approval first.

`AI_RULES.md` already lists "a new mechanic is required" as a stop-and-ask.
Both are enforcement without a subject: neither says **what an approved
mechanic is**, what document holds it, or how an agent tells "new mechanic"
from "new content". So the rule can only be obeyed by stopping, and the
project has no artifact between "the story says there is a broken robot" and
"someone wrote a `RobotSystem`".

The missing artifact is a **mechanic specification**: one file per mechanic,
stable ID, design intent through acceptance criteria, approved before code.

## Pipeline

```
STORY INTENT            what the chapter needs to happen
      ↓
NARRATIVE BEAT          the moment the player lives through
      ↓
CLASSIFICATION          M0..M4 — is this even a mechanic?          ← gate 1
      ↓
MECHANIC DESIGN         player verb, rules, feedback, rewards
      ↓
ARCHITECTURE CONTRACT   systems, state, events, save, tests
      ↓
PM APPROVAL             human, recorded in the spec header         ← gate 2
      ↓
TASK BREAKDOWN          ACTIVE_TASK.md, one task at a time
      ↓
IMPLEMENTATION          code + tests
      ↓
QA / BALANCE            acceptance.md + economy numbers
      ↓
LIVE                    CURRENT_STATE.md reflects it               ← gate 3
```

The two rules that matter: **story does not reach code directly**, and
**classification comes before design** — most narrative beats are not
mechanics and must not cost a mechanic spec.

## Hats, not headcount

This project is one human PM plus AI agents. Roles below are hats an agent
wears in sequence, and the point of naming them is to keep the questions
separate — not to pretend there is a team.

| Hat                | Owns                                                                  | Must not decide                       |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------- |
| Narrative designer | why the beat exists, what is revealed, which voice, chapter placement | costs, rules, systems                 |
| Game designer      | player verb, rules, limits, feedback, rewards, progression, balance   | class names, events, schemas          |
| Game architect     | systems, state, events, persistence, tests, migration                 | whether the mechanic is fun or wanted |
| Developer          | implementation, tests, reporting deviations                           | gameplay rules — see "Design change"  |

**One agent may wear every hat. No agent approves its own design.** Gate 2 is
the human PM, per `AI_RULES.md`. That is the only thing keeping this from
being ceremony an agent performs on itself.

## Gate 1: classification

Before writing anything, classify. This is the step that keeps the process
cheap.

| Class  | Meaning                             | Example in this repo                                         | Requires                                                    |
| ------ | ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| **M0** | Content only                        | a third item in the Water chain; another `MERGE_COUNT` quest | nothing — `content-pipeline.md` already covers it           |
| **M1** | Existing system, new config         | a second generator; a new chapter                            | nothing new; note it in the PR                              |
| **M2** | Existing system, changed rule       | merges costing energy; orders expiring                       | short-form spec + regression tests                          |
| **M3** | New player verb                     | selling an item; expanding the board                         | full spec + PM approval                                     |
| **M4** | New persistent/cross-cutting system | temporary events; a robot with its own state                 | full spec + PM approval + **ADR** + save-migration analysis |

Rules of thumb, in order:

1. If no existing system's rules change, it is M0/M1 — stop, just author it.
2. If a save field would be added, it is at least M3, and M4 if it is a new
   block. Save shape is a contract (`data-contracts.md`).
3. If a new `DomainEvent` variant is needed, it is at least M2.
4. If a new currency, a monetization surface, or an MVP non-goal is involved,
   it is out of scope until the PM says otherwise — classification does not
   grant permission.

**A new content kind is not automatically a new system.** Prefer expressing a
beat with `MergeSystem` + `OrderSystem` + `QuestSystem` + dialogue before
proposing anything new. "Can an existing mechanic express this?" is a question
that must be answered in writing, not assumed.

## Narrative beat → decision

For each beat in a chapter, exactly one outcome:

| Outcome                     | Cost               | Example                                            |
| --------------------------- | ------------------ | -------------------------------------------------- |
| Narrative context only      | a dialogue file    | the Professor comments on the restored wing        |
| New content, existing rules | content files      | a chemistry merge chain and the orders that use it |
| Existing mechanic extended  | M2 short-form spec | orders that require a _discovered_ item            |
| New mechanic                | M3/M4 full spec    | only when the three above cannot express the beat  |

Beats are documented alongside the chapter (`docs/design/narrative.md` or a
per-chapter page), **not** in content JSON. Adding a "beat" content kind would
itself be M4 and is deliberately not proposed here.

Writing new story beats still needs approval — `narrative.md` rules apply
unchanged. This pipeline does not license inventing canon; it gives approved
canon somewhere to land.

## Architecture contract, in this repo's vocabulary

The architect section of a spec must be written in terms this codebase
actually has:

```
player input   → presentation/ scene calls a system method
system method  → validate fully → mutate → emit DomainEvent   (atomic)
observers      → Quest / Tutorial / Progression / AnalyticsBridge react
state          → GameState field → SaveDataV1 (versioned) → SaveSystem
content        → content/<kind>/*.json + Zod schema + validator rules
```

Two corrections to the vocabulary usually reached for:

- **There is no command bus.** `src/application/commands/` and
  `handlers/` contain only `.gitkeep`. A spec must name a **system method**
  (`ProgressionSystem.upgradeLab()`), not invent a `RepairRobotCommand`.
  Introducing a command layer is itself an architecture change needing an ADR.
- **Events are past tense and never commands** (`system-map.md`). A spec that
  lists an event as a trigger for gameplay logic is describing an observer,
  and observers may not assume ordering.

Every spec must also answer: does this add a `DomainEvent` variant (additive,
safe) or change one (audit every observer)? Does it touch `SaveDataV1`
(optional-with-default only while v1 is unreleased, otherwise v2 + migration)?

## Lifecycle

Six states, in the spec header, mirrored by `CURRENT_STATE.md`:

```
DRAFT → REVIEW → APPROVED → IMPLEMENTED → LIVE
                     ↓
                 REJECTED / SUPERSEDED
```

- **DRAFT** — being written; agents must not implement it.
- **REVIEW** — complete and awaiting the PM.
- **APPROVED** — implementable. Only a human moves a spec here.
- **IMPLEMENTED** — code landed, tests green, not yet balanced/played.
- **LIVE** — balanced and in the build; `CURRENT_STATE.md` says so.
- **REJECTED / SUPERSEDED** — kept, never deleted; ID is never reused.

A mechanic may not enter implementation without: an owner, a player verb,
rules, feedback, rewards, dependencies, acceptance criteria, and a save
answer. Missing any of those means it is still DRAFT, whatever the header says.

## Design change rule

If implementation shows the approved design cannot be built as written:
**stop**. Do not redefine the mechanic in code. Set `ACTIVE_TASK.md` to
`STATUS: BLOCKED` with the conflict, return the spec to REVIEW, and let the
PM decide. Silently shipping a different mechanic than the one approved is the
exact failure this pipeline exists to prevent — and it is the same rule
`AI_RULES.md` already applies to spec/code conflicts.

## What owns what

Duplication is the way this rots. Each fact has one home:

| Question                              | Lives in                                 |
| ------------------------------------- | ---------------------------------------- |
| What is canon?                        | `docs/MASTER_SPEC.md`                    |
| Why was this architecture chosen?     | `docs/architecture/ADR/`                 |
| What is _this mechanic's_ design?     | `docs/design/mechanics/ML-MECH-###-*.md` |
| How does the game work **today**?     | `docs/design/game-design.md`             |
| What is the current task's boundary?  | `docs/ai/ACTIVE_TASK.md`                 |
| What does "done" mean for any change? | `docs/qa/acceptance.md`                  |
| What is built, thin, or blocked?      | `docs/ai/CURRENT_STATE.md`               |

A mechanic spec is written **once, before** the code, and then describes
intent. It is not updated to track implementation — that is
`CURRENT_STATE.md`'s job. When they disagree about what exists, `CURRENT_STATE`
is right about reality and the spec is right about intent, and the difference
is a finding to report.

## Enforcement

Nothing here is machine-checked today, and an unchecked process in this repo
rots the way `CURRENT_STATE.md` warns about. On approval, phase 2 adds
`pnpm mechanics:validate` (alongside `tools/content-validator/`), checking:

- IDs unique, well-formed, matching the filename, never reused;
- header fields present and `STATUS`/`CLASS` from the allowed sets;
- `M4` and any save-schema change carry an ADR link that resolves;
- every referenced system, `DomainEvent`, content ID and test path exists;
- `README.md`'s index matches the files on disk.

Until that exists, this process is honour-based, which is worth saying out
loud rather than implying rigour that is not there.

## Open questions for the PM

1. **Where does this live in canon?** The proposal that prompted this asked
   for a `MASTER_SPEC` section `A14A`, after "Story Architecture / Chapter
   Design" and before "Events". That numbering conflicts with
   `CONTEXT_MAP.md`, where A13 is Quests, A14–A15 are Narrative/Dialogue,
   A11–A12 are Progression/Chapters and A21–A22 are Events. Both cannot be
   right and MASTER_SPEC is not here to settle it. Reported, not resolved.
2. **Retro-document how much?** One worked example (ML-MECH-001) is written.
   Backfilling merge, generators, orders and quests is real effort for
   documentation of things that already work.
3. **Phase 2 tooling now or later?** Building a validator for an unratified
   process is premature; leaving it unenforced is how it dies.
