```text
ADR-ID: 0009
TITLE: Merges award XP, using the result item's content-defined xpValue
STATUS: Accepted
CONTEXT:
  Canon §5 lists merges, first discoveries, completed orders, completed
  quests and explicit level rewards as XP sources. The implementation
  granted XP from ORDER_COMPLETED only. ItemDefinition.xpValue existed,
  was validated by the content validator, and was read by nothing.
  The campaign gap analysis reported this as a canon/code conflict rather
  than resolving it. The PM ruled that canon is right: merges award XP.
  (Numbers 0007 and 0008 are held by open PRs, hence the gap on main.)
DECISION:
  - ProgressionSystem grants the *result* item's xpValue on ITEM_MERGED.
    The amount stays content-defined, like every other XP value — no
    constant enters the code.
  - ProgressionSystem takes ItemRegistry as a dependency to resolve that
    value. It already owned the XP track; giving it the registry is
    cheaper than routing the number through the event, which would put a
    balance value in a payload that other observers do not need.
  - Generator spawns do NOT award XP. Canon names merges; ITEM_SPAWNED is
    not a merge, and paying for it would make the generator both the
    energy sink and an XP faucet.
  - First discoveries are NOT wired, though canon §5 lists them. There is
    only one xpValue per item, so paying it on both the merge and the
    first discovery would double the first merge of every item — a
    balance decision nobody has made. Wiring it properly needs either a
    second content field or an explicit ruling that reuse is intended.
    Reported, not guessed. Quest XP is absent for the same reason:
    QuestDefinition has no xp reward field.
ALTERNATIVES:
  - A flat XP-per-merge constant in code: rejected — it contradicts the
    project's own rule that balance lives in content, and it would make
    every item's merge worth the same regardless of depth in its chain.
  - Carrying xpValue on the ITEM_MERGED event: rejected — the event
    describes what happened, and every other observer (quests, tutorial,
    analytics) would have to ignore a field only progression uses.
  - Retuning LevelCurve at the same time: deliberately not done. The PM
    approved merges as an XP source, not a curve change; measuring first
    is what makes a later curve decision informed rather than reactive.
CONSEQUENCES:
  - Measured with pnpm economy:simulate over 15 simulated hours of optimal
    play: XP rises from 1245 to 1743 (+40%), and the player ends at level
    6 instead of 5. The quadratic curve absorbs most of the increase —
    40% more XP buys roughly one extra level, not a broken pace.
  - The coin economy is unchanged. Merge XP produces no currency, so every
    coin figure and the energy-bound conclusion in economy.md still hold.
  - The simulator gained level/XP reporting. It could not previously show
    the effect of an XP change at all, which made "measure it" impossible
    to satisfy honestly.
  - Whether LevelCurve should be retuned is now a decision with numbers
    behind it. It is open, and listed in CURRENT_STATE.
MIGRATION:
  None. No save field, content field or event payload changed; existing
  saves keep their XP and level and simply accrue faster from here.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-26
```
