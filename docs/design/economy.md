# Economy (as built)

Canon is `docs/MASTER_SPEC.md` (A9, A16). This page records what the
implementation does and what is still undecided.

## Currencies

| Currency         | Faucet                      | Sink                               | Mutated by      |
| ---------------- | --------------------------- | ---------------------------------- | --------------- |
| `coins`          | orders, quests              | lab stage upgrades, board sections | `EconomySystem` |
| `gems`           | quests (no content uses it) | _none yet_                         | `EconomySystem` |
| `researchPoints` | orders, quests              | research nodes — unbuilt           | `EconomySystem` |
| `energy`         | time (1/60 per second)      | generator use                      | `EnergySystem`  |

Energy lives in the same `CurrencySave` block but is **not** an economy
currency: it never passes through `EconomySystem`, and it regenerates rather
than being earned. Treating it as a currency is the most common way to break
the pacing model.

Neither of the two secondary currencies is fully closed yet, but for
different reasons — worth keeping apart, because only one of them is waiting
on a decision.

**Research points have a specified sink that isn't built.** Canon §11
introduces Research at Level 5 and §42 defines the node tree it is spent on.
Orders and quests already pay research points out; the tree, the
`UNLOCK_RESEARCH` requirement and the spend path are step 7 of the build order
in `campaign-gap-analysis.md`. Nothing is undecided here — it is unimplemented,
which is why the currency is already a faucet.

**Gems have a faucet nothing uses and no sink at all.** `QuestDefinition`
carries `gemReward` and `QuestSystem` grants it, so the faucet exists in code;
no content sets it above 0, and nothing spends gems. Canon is silent because
it does not cover monetization at all. Gems are the natural premium currency,
and both ends of that loop are part of the undecided monetization design
(`monetization.md`) — a decision, not a backlog item.

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

## The balance pass (measured)

The three findings below were fixed by tuning content only. Every number was
derived from the energy budget and then verified with `pnpm economy:simulate`
— the before/after is in the PR that landed them.

### The constant that shapes everything

The opening energy bar is 100, and regen is 1/minute. **The bar is worth 100
minutes of income.** Anything costing less than one bar is therefore cleared
before regen matters at all — no amount of coin tuning changes that, because
the ratio comes from the energy rules, which are PM-approval territory.

So lab stages are priced in _bars_, not in round numbers:

| Stage | Cost | Bars | Reached (optimal play) |
| ----- | ---- | ---- | ---------------------- |
| 2     | 50   | 0.08 | immediately            |
| 3     | 750  | 1.20 | 0.5 h                  |
| 4     | 1450 | 2.32 | 5.3 h                  |
| 5     | 2400 | 3.84 | 12.4 h                 |

**Stage 2 is deliberately not a pacing gate.** It is the tutorial's "restore
the next wing" beat, and a minimal tutorial run yields 65 coins — 25 from the
first order plus 40 from the discovery quest. Price it above that and the
tutorial cannot finish, which is what the earlier rebalance to 25 was
avoiding. 50 keeps the beat while doubling its weight. Stage 3 is where
pacing actually starts, and it moved from 6 minutes to 30.

### Orders: the merge has to pay

`order.water_delivery` was strictly dominated at 2.5 coins/energy against
`order.first_sample`'s 6.25. The first attempt at a fix made it worse in a
way worth recording, because the arithmetic is not obvious:

> Dropping it to **1 water for 12 coins** made two raw waters worth 24 while
> merging them into steam paid 25. A merge earned **one coin** for an extra
> action, so the simulation stopped merging almost entirely — 384 merges fell
> to 18, and 733 waters were delivered raw. The core loop died on a
> one-coin margin.

The rule that came out of it: **a merge must pay a clear premium over
delivering the same items raw.** Current numbers:

| Order                  | Cost    | Coins | Coins/energy |
| ---------------------- | ------- | ----- | ------------ |
| `order.water_delivery` | 2 water | 16    | 4.00         |
| `order.first_sample`   | 1 steam | 25    | 6.25         |

Two waters raw pay 16; merged and delivered they pay 25 — a **+56% merge
premium**. `water_delivery` is the fallback when a pair is inconvenient to
merge, not a competitor. It is still rarely optimal, and that is honest:
with one merge chain and two orders consuming the same resource, one of them
is always second-best. That is a content-volume limit, not an arithmetic bug.

### Quests

Quests were paying about 2 coins per energy they asked for while orders paid
6.25, so a quest read as a rounding error next to the delivery it
interrupted. They now total 115 coins against a 50-coin stage 2, making the
opening quests a real assist rather than decoration.

### Board: cells are computed, not guessed

The starter area is **14 cells**, derived from what the content actually
needs to avoid blocking:

```text
 3  one full generator cycle (chargesPerCycle)
 3  a second cycle before merging is forced
 2  one item held per chain level (water, steam)
 2  staging the largest order requirement
 4  headroom for two more chain levels
--
14
```

Eight sections follow canon §39's eight unlock steps, keyed to the gates that
exist (lab stage, player level) since campaign levels do not — see ADR-0011
for why that mapping is stated rather than silent.

| Section         | Cells | Gate            | Cost | Opened |
| --------------- | ----- | --------------- | ---- | ------ |
| Starter Bench   | 14    | —               | 0    | start  |
| Power Console   | 7     | playerLevel ≥ 2 | 40   | 5 min  |
| The Locked Room | 7     | labStage ≥ 2    | 80   | 5 min  |
| Chemistry Bay   | 7     | labStage ≥ 3    | 140  | 53 min |
| Biology Bay     | 7     | playerLevel ≥ 4 | 200  | 4.1 h  |
| Robotics Bay    | 7     | labStage ≥ 4    | 260  | 6.0 h  |
| Advanced Bay    | 7     | playerLevel ≥ 6 | 320  | 13.2 h |
| HELIX Vault     | 7     | labStage ≥ 5    | 400  | 14.3 h |

Peak occupancy is still 4 cells and `boardFull` blocks are still zero, so the
board never binds — as decided, board pressure waits for content volume
rather than being manufactured by shrinking the starter.

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
