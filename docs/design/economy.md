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
repair lands inside the tutorial rather than after a long grind. The later
costs (500 → 3000) have **not** been validated against a real faucet rate —
there is no economy simulation behind them.

## Missing: economy simulation

`tools/economy-simulator/` is an empty placeholder. Until something models
coins-per-session against the upgrade curve, every number past stage 2 is a
guess. Balance changes should say so rather than implying they're tuned.

## Rules for changing the economy

- New currency → human approval + ADR (it changes the save schema and the HUD).
- New faucet or sink → content change if the mechanism exists; approval if it
  doesn't.
- Rebalancing existing numbers → content-only, but say what you're optimizing
  for, and don't silently change the tutorial's pacing.
