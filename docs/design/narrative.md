# Narrative (as built)

Canon is `docs/MASTER_SPEC.md` (A14, A15). Narrative canon — who the Professor
is, what happened to the laboratory, where the story goes — is **not** an
agent's to invent or extend. This page covers the delivery mechanism and the
tone that's already on the page.

## Premise as written

The player arrives at an abandoned laboratory that "was yours before it was
mine," summoned by a letter from the Professor. Restoring the lab, wing by
wing, is the meta-progression; rediscovering materials is the moment-to-moment
loop.

## Voices

Two speakers exist in content:

- `narrator` — scene-setting, third person, sparse.
- `professor` — the only character, second person, addressing the player
  directly.

Adding a third speaker is a canon change, not a content chore.

## Tone

Taken from the shipped lines: quiet, unhurried, a little melancholy. The
Professor explains mechanics _in character_ rather than as UI copy — "Drag two
identical samples together and they will combine into something better" is
both a tutorial instruction and a line of dialogue. That pairing is the house
style; instructional text that breaks character does not match what's there.

## Delivery mechanism

`DialogueDefinition` (`content/dialogues/*.json`) is a list of `{speaker,
text}` lines plus a `oneShot` flag. `DialogueSystem` starts, advances, and
completes a dialogue, emitting `DIALOGUE_STARTED` / `DIALOGUE_ADVANCED` /
`DIALOGUE_COMPLETED`. `DialogueView` renders the overlay.

One-shot dialogues are recorded in `seenDialogueIds` on load-bearing save
state, so chapter intros and tutorial beats never replay. Reordering or
renaming a dialogue ID therefore affects existing saves.

## Where dialogue is triggered

| Trigger        | Content                             |
| -------------- | ----------------------------------- |
| Chapter unlock | `ChapterDefinition.dialogueIds`     |
| Tutorial step  | `TutorialStepDefinition.dialogueId` |

Both are declarative — nothing calls `DialogueSystem.start()` from gameplay
logic to fire a story beat.

## Tutorial as narrative

The tutorial is four steps, each completed by a real domain event rather than
a UI acknowledgement:

1. `tutorial.first_merge` — drag two Water samples together (`ITEM_MERGED`).
2. `tutorial.use_generator` — use the Water Tap (`GENERATOR_USED`).
3. `tutorial.first_order` — deliver an order (`ORDER_COMPLETED`).
4. `tutorial.first_upgrade` — restore the next wing (`LAB_UPGRADED`).

Steps 2–4 each carry a Professor dialogue. The chain walks the player through
the whole session loop, which is why the stage-2 upgrade cost was tuned to
land inside it (`economy.md`).

## Chapters

`chapter.basement` (stage 1, no unlock conditions) and `chapter.chemistry`
(stage 2, requires the basement plus `labStage>=2`). Both currently expose the
same single item group and generator — chapters are structurally complete but
narratively thin, and adding more is content work against canon that doesn't
exist in the repo yet.

## Rules

- Don't write new story beats, characters, or lore without approval — a
  plausible-sounding invented line becomes canon the moment it ships.
- Do keep mechanical instructions in the Professor's voice.
- Localization is not wired (`content/localization/` is empty); dialogue text
  is currently English strings in content files. Assume it will be extracted
  later and avoid embedding text anywhere but content.
