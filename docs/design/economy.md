# Economy (as built)

Canon is `docs/MASTER_SPEC.md` (A9, A16). This page records what the
implementation does and what is still undecided.

## Currencies

| Currency         | Faucet                 | Sink               | Mutated by      |
| ---------------- | ---------------------- | ------------------ | --------------- |
| `coins`          | orders, quests         | lab stage upgrades | `EconomySystem` |
| `gems`           | _none yet_             | _none yet_         | `EconomySystem` |
| `researchPoints` | orders, quests         | _none yet_         | `EconomySystem` |
| `energy`         | time (1/60 per second) | generator use      | `EnergySystem`  |

Energy lives in the same `CurrencySave` block but is **not** an economy
currency: it never passes through `EconomySystem`, and it regenerates rather
than being earned. Treating it as a currency is the most common way to break
the pacing model.

Research points have no sink. Gems have neither a faucet nor a sink: the
schema, the HUD slot and `QuestDefinition.gemReward` all exist, but no content
grants them and nothing spends them. That's a live design gap, not a bug —
gems are the natural premium currency, and both ends of that loop are part of
the undecided monetization design (`monetization.md`).

## The one mutator rule

Every coin, gem, or research-point change goes through `EconomySystem.grant()`
or `.spend()`. `spend()` throws `InsufficientFundsError` rather than clamping
to zero, so a caller can't accidentally hand out something for free. Every
change emits `CURRENCY_CHANGED` with the delta and new balance, which is what
quests (`EARN_COINS`) and analytics observe.

Nothing else may write to `state.currencies`.

## Energy pacing

- Cap: 100.
- Regen: 1 point per minute, computed from elapsed real time via the injected
  `Clock` — not a ticking timer, so it accrues correctly across a closed tab.
- Cost: `gen.water_tap` charges 2 energy per use.

At current numbers a full bar is 50 generator uses and a full refill takes
about 100 minutes. Whether that's the intended session length is a balance
question the spec should settle, not something to tune ad hoc.

## Current numbers

Faucets and sinks as defined in content today:

- `order.water_delivery` — 2× `item.water` → 10 coins, 2 XP.
- `order.first_sample` — 1× `item.steam` → 25 coins, 1 research, 5 XP.
- `quest.first_merges` — 3 merges → 15 coins.
- `quest.discover_steam` — → 20 coins, 1 research.
- `quest.tap_the_water` — 5 generator uses → 10 coins.
- Lab stages — 2: 25 coins, 3: 500, 4: 1200, 5: 3000.

The stage-2 cost was rebalanced down to 25 (commit `34224ac`) so the first
repair lands inside the tutorial rather than after a long grind.

## What the numbers actually produce

`pnpm economy:simulate` drives a real `GameContext` headlessly with an
optimal player — merges everything, delivers the best-paying order, generates
whenever it can, upgrades the moment it can afford to. Optimal is deliberate:
it measures the **floor** on how long progression takes, so anything it flags
is real, and a live player is slower rather than faster.

Measured on the content above (`pnpm economy:simulate 900 30`):

| Lab stage           | Cost | Reached at | Time in previous stage |
| ------------------- | ---- | ---------- | ---------------------- |
| 2 Chemistry         | 25   | ~0h        | —                      |
| 3 Biology           | 500  | 0.1h       | 0.1h                   |
| 4 Robotics          | 1200 | 2.9h       | 2.8h                   |
| 5 Advanced Research | 3000 | 10.9h      | 8h                     |

Player level over the same run: **6** at 1743 XP, crossing levels at 0.1h,
1.2h, 4.1h, 7.9h and 12.7h.

XP comes from two sources today (canon §5 also lists first discoveries and
quests, which are not wired): `ORDER_COMPLETED.xpReward`, and — since
ADR-0009 — the result item's `ItemDefinition.xpValue` on every merge. On the
run above that is 249 × 5 from orders plus 249 × 2 from merges. Merges add
**40% more XP**, which the quadratic `LevelCurve` absorbs into roughly one
extra level over 15 hours: the same run reached level 5 before merge XP and
level 6 after.

Steady state is **6.25 coins/min (375/h)**, and it is energy-bound: the
generator is blocked waiting for energy on ~90% of ticks, never by board
space. Tick size does not change the economics — only the blocked-reason
percentages, which are per-tick counts by construction.

The chain is rigid: 1 energy/min ÷ 2 energy per generator use = 0.5 Water/min
→ 0.25 Steam/min → 0.25 × 25 coins. Every coin number in the game is a
multiple of the energy regen rate.

## Three findings the simulation surfaced

These are reported, not fixed — balance is a PM decision (see the rules
below), and each is a real property of the current content, not a simulator
artefact.

1. **The 500-coin stage-3 gate does nothing.** A new player starts with a
   full 100-energy bar, which converts to ~625 coins — so stages 2 and 3 both
   fall inside the first few minutes, before the tutorial has finished. Only
   stage 4 onwards is actually paced by anything.
2. **`order.water_delivery` is dead content.** It pays 10 coins for 2 Water;
   merging those same 2 Water into 1 Steam and delivering `order.first_sample`
   pays 25. No rational player ever delivers it, and the simulation completed
   it zero times across every run. It is arithmetic, not strategy — the
   dominated order can never be worth taking while those numbers hold.
3. **The 7×9 board is 94% idle.** Peak occupancy is 4 of 63 cells. Board size
   is not a constraint on anything at this content volume, so any design that
   assumes board pressure (a merge-space squeeze, a storage upgrade) currently
   has nothing to push against.

## Rules for changing the economy

- New currency → human approval + ADR (it changes the save schema and the HUD).
- New faucet or sink → content change if the mechanism exists; approval if it
  doesn't.
- Rebalancing existing numbers → content-only, but say what you're optimizing
  for, and don't silently change the tutorial's pacing.
- Any of the above → re-run `pnpm economy:simulate` and quote the new numbers.
  It takes seconds and it is the difference between a tuned number and a
  guess. The simulator reads the same content the game does, so a content
  change is reflected without touching the tool.
