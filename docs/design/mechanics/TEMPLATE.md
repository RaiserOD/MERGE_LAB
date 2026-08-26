# Mechanic spec template

**STATUS: Proposed** with the rest of `docs/design/mechanic-pipeline.md`.

Two forms. Pick by class — using the full form for an M2 is not thoroughness,
it is a document nobody will keep current.

- **M0 / M1** — no spec. Author the content; `content-pipeline.md` covers it.
- **M2** — short form.
- **M3 / M4** — full form.

Filename: `ML-MECH-###-kebab-title.md`, matching `MECHANIC_ID`.
Delete every field that genuinely does not apply, and say `none` rather than
leaving a heading empty — a blank field reads as "not thought about yet",
which is exactly what the reviewer needs to be able to see.

---

## Short form (M2)

````markdown
# ML-MECH-### — Title

```text
MECHANIC_ID:  ML-MECH-###
CLASS:        M2
STATUS:       DRAFT
CHAPTER:      chapter.<id> | n/a
APPROVED_BY:  —
DATE:         —
```

## What changes

Which existing system's rule changes, and from what to what.

## Why

The beat or problem this serves. One paragraph.

## Rules

- Preconditions.
- Valid action → state change.
- Invalid action → rejection (never a silent no-op).

## Blast radius

Systems, events, content and saves affected. Which existing behaviour could
regress, and the regression test that would catch it.

## Acceptance criteria

- Player-observable statements a reviewer can check.
- `tests/unit/...` naming the regression this change must not cause.
````

---

## Full form (M3 / M4)

````markdown
# ML-MECH-### — Title

```text
MECHANIC_ID:  ML-MECH-###
CLASS:        M3 | M4
STATUS:       DRAFT | REVIEW | APPROVED | IMPLEMENTED | LIVE | REJECTED | SUPERSEDED
CHAPTER:      chapter.<id> | n/a
ADR:          ADR-#### | none (required for M4)
SUPERSEDES:   ML-MECH-### | none
APPROVED_BY:  — (human PM; an agent never fills this in)
DATE:         —
```

## 1. Intent

PURPOSE — what this exists to do, in one sentence.
PLAYER_FANTASY — what the player feels they are doing.
PILLARS — which of discovery / restoration / short satisfying actions.

## 2. Narrative context

STORY_PURPOSE — why the story needs it.
TRIGGER — what in the fiction starts it.
REVEALS — what the player learns.
VOICES — `narrator` / `professor` only; a third speaker is a canon change.

Leave `none` for a mechanic with no story load. Do not invent canon here.

## 3. Player action

VERB — the single verb (merge, deliver, restore, sell…).
INPUT — what the player manipulates.
TARGET — what it acts on.
WHERE — board, HUD, order panel, lab screen.

If the verb is one the game already has, this is probably not M3. Reclassify.

## 4. Rules

PRECONDITIONS — every condition checked before mutating.
ON_SUCCESS — the state change, in order: validate → mutate → emit.
ON_FAILURE — what the player sees; rejection, never a silent no-op.
LIMITS — caps, cooldowns, per-session or per-chapter limits.

## 5. Feedback

VISUAL / AUDIO / UI / NARRATIVE. Placeholder art is fine to specify against;
say so.

## 6. Economy

CONSUMES — items, coins, energy, time.
GRANTS — currencies, XP, items, progression.
FAUCET_OR_SINK — which side of `economy.md` this lands on.
NUMBERS — starting values, and explicitly whether they are tuned or guessed.
There is no economy simulator (`tools/economy-simulator/` is empty), so
"guessed" is the honest answer for most of them.

New currency → stop, that is a PM decision with an ADR.

## 7. Progression

UNLOCKED_BY — condition, in the form `ProgressionSystem` can already evaluate.
UNLOCKS — what becomes available.
LATER — interactions deferred to future mechanics, so scope does not drift.

## 8. Architecture contract

SYSTEM — existing system that owns it, or the new one and why nothing existing
can hold it (M4 only).
METHOD — the system method the presentation layer calls. Not a command class:
`src/application/commands/` is an empty placeholder.
EVENTS — new `DomainEvent` variants (additive) or changed ones (audit every
observer in `system-map.md`).
OBSERVERS — which of Quest / Tutorial / Progression / Analytics react, and
confirmation that none depends on another's ordering.
DOMAIN_STATE — `GameState` fields.
PERSISTENT_STATE — `SaveDataV1` fields; optional-with-default only while v1 is
unreleased, otherwise `SaveDataV2` + migration + a test loading a real v1
payload.
CONTENT — new content kind or new fields, plus the validator rules that must
be taught in the same change.
FLAGS — `FeatureFlags` gate, if any. Monetized paths ship default-off.
MIGRATION — required / not required, and why.

## 9. Presentation

UI, animation, VFX, SFX. No gameplay logic in scenes — they render and
dispatch.

## 10. Analytics

EVENTS — names in the A24 vocabulary (`AnalyticsEvent.ts`).
SUCCESS_METRIC / FAILURE_METRIC — what would show this mechanic works or does
not. Emitted only through `AnalyticsBridge`.

## 11. Acceptance criteria

PLAYER — observable in a real session.
SYSTEM — atomicity, exactly-once rewards, rejection paths.
SAVE — survives reload; a valid save round-trips.
TESTS — the files that must exist: `tests/unit/...`, `tests/integration/...`,
e2e if presentation or boot changes.

## 12. Non-requirements

What this deliberately does NOT do. The most valuable section: it is what
stops the next agent from "finishing" the mechanic in a direction nobody
approved.

## 13. Open questions

Anything unresolved. A spec with open questions cannot be APPROVED.
````
