# Game design (as built)

Canon is `docs/MASTER_SPEC.md`. This page describes **what the code actually
does today**, so an agent can answer "how does merging work here?" without
reading five systems. Where the two disagree, the spec wins and the conflict
gets reported — see `docs/ai/AI_RULES.md`.

## Board

A fixed 7×9 grid (63 cells), configured in `src/config/runtime.ts`. Cells are
`EMPTY`, `OCCUPIED`, `BLOCKED`, or `LOCKED`. Dimensions are an invariant:
positions are persisted, so changing the grid is a save migration and needs
approval.

## Merging

Two items merge when they share a `mergeGroup` and `level`, neither is locked,
and the lower item defines a `resultItemId`. The player drags one onto the
other; the dragged item is consumed and the target cell becomes the result.

The transaction is atomic — validate everything first, then mutate, then emit
`ITEM_MERGED`. There is no partial merge state, which is what makes save-on-
merge safe.

An item at the top of its chain sets `maxLevel: true` and has no
`resultItemId` (e.g. `item.steam`). Merging two of those is rejected, not
silently ignored.

Merge chains are declared entirely in content: each item points at its
successor. There is no merge table anywhere in code.

## Discovery

The first time an item appears on the board — spawned by a generator or
produced by a merge — `ProgressionSystem` records it in `discoveredItemIds`
and emits `ITEM_DISCOVERED`. Repeat sightings are a no-op. Discovery is what
quests and the collection meta hang off, and it is the mechanical form of the
product promise.

## Generators

A generator produces one item type on demand, costing energy and consuming a
charge. Charges refill on a cooldown driven by the injected `Clock`, so the
refill is deterministic and testable.

`gen.water_tap`: outputs `item.water`, 2 energy, 3 charges, 5s cooldown.

Using a generator requires a free board cell; a full board is a rejection, not
a dropped item.

## Energy

A single soft cap (100) regenerating at 1/60 per second — one point per
minute, a full refill in about 100 minutes. Energy is paced by `EnergySystem`
and is deliberately _not_ an economy currency: it is never granted or spent
through `EconomySystem`.

## Orders

An order lists item requirements and pays coins, research points and XP.
Completing one removes the required items from the board and emits
`ORDER_COMPLETED`. Orders are the main coin faucet.

## Progression

Three parallel tracks:

- **Player level** — XP with thresholds in `LevelCurve`. The only XP source
  wired today is `ORDER_COMPLETED.xpReward`; items carry an `xpValue` in
  content that nothing currently reads.
- **Lab stage** — the restoration meta. Each stage has a coin `upgradeCost`
  (stage 2: 25, then 500 / 1200 / 3000) and a title, from
  `content/lab-stages/stages.json`.
- **Chapters** — content gates unlocked by a condition string (currently lab
  stage thresholds), evaluated in `ProgressionSystem`.

## Quests

Event-driven, never polled. Types implemented: `MERGE_COUNT`,
`DISCOVER_ITEM`, `COMPLETE_ORDER`, `EARN_COINS`, `USE_GENERATOR`. A quest
subscribes through `QuestSystem`, advances on matching events, and pays out
once on completion.

Adding a quest _type_ means adding both a schema variant and a subscription;
adding a quest _instance_ is content only.

## Tutorial

A linear chain of steps in `content/tutorial/steps.json`. Each step names the
domain event that completes it, so the tutorial never blocks on UI state — it
advances when the player actually does the thing. Steps show a banner and can
trigger a dialogue.

## Dialogue

Two voices — a sparse `narrator` and the `professor`. Dialogues are line
lists, played once and recorded in `seenDialogueIds` so chapter intros don't
replay. See `narrative.md`.

## What is deliberately absent

No energy purchase, no timers beyond generator cooldowns, no item selling,
no temporary events. Each is a design decision that hasn't been made — not an
oversight to fill in.

Board _expansion_ is no longer on that list: the board opens progressively,
section by section, per canon §39 (ADR-0011). The board itself is still a
fixed 7×9 — what changes is how much of it the player can reach.

`ItemDefinition.xpValue` used to sit here as an unread forward declaration; it
is live now — merges pay it (ADR-0009). `ItemDefinition.sellValue` is still
unread, and is now **optional**: with no selling mechanic there is nothing to
balance it against, so a new item shouldn't have to invent a number for it.
The two existing items keep the values they already carry.
