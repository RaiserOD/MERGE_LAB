```text
ADR-ID: 0012
TITLE: Unlocking a board section is a level's grant, not a level's requirement
STATUS: Accepted
CONTEXT:
  Canon §4 defines a closed union of ProgressionRequirement types. Canon
  §10 (Level 4, "The Locked Room") lists "UNLOCK first board section" as a
  *required action* for that level. There is no requirement type that can
  express it, so canon asks Level 4 for a condition canon cannot represent
  — and §3 makes this fatal rather than cosmetic, because a level is
  complete when "all mandatory conditions in its content definition are
  satisfied", and a condition outside §4's union has nowhere to be
  authored.
  ADR-0011 reported this rather than resolving it. Two readings were put
  to the PM: §4's list is incomplete and needs a new type, or Level 4's
  action maps onto something that already exists.
  The PM chose the second. Canon supports it directly: §9 already lists
  "first board cell unlock" among **Level 3's Unlocks**. Canon grants the
  first board cells one level *before* §10 asks the player to earn them.
DECISION:
  - Canon §4's union stays closed. No UNLOCK_BOARD_SECTION type is added,
    to canon or to `ProgressionRequirement`.
  - A board section is **granted** by progression and then **bought** by
    the player. Those are two events, not one:
      * `BOARD_SECTION_OFFERED` — the campaign made it available. This is
        the step canon §3 calls "UNLOCK LEVEL CONTENT" / "EMIT
        CONTENT_UNLOCKED". Nothing is asked of the player.
      * `BOARD_SECTION_UNLOCKED` — the player paid the content-defined
        coin cost, which canon §39 keeps as content data.
  - `unlockConditions` on a section describe **when the campaign grants
    it**, not what the player must accomplish. The vocabulary and the code
    are unchanged; what changed is what they mean, and the comments now
    say so.
  - The correction canon needs is in **§10**, not §4: Level 4's required
    actions should drop "UNLOCK first board section", which duplicates the
    grant §9 already makes. Reported upward as a proposed amendment.
  - The offer is not persisted. Unlock conditions are monotonic — lab
    stage and player level only rise, chapters only unlock — so an offer
    once made cannot be withdrawn, and re-deriving it from content is
    exact. A saved copy would be a second home for a fact already
    derivable, which is the trap ADR-0011 avoided for cell state.
ALTERNATIVES:
  - Add UNLOCK_BOARD_SECTION to §4 and to ProgressionRequirement:
    rejected by the PM. It would make the board the only piece of content
    a level can require the player to *buy*, turning a coin purchase into
    a progression gate and letting a player stall Level 4 indefinitely by
    spending coins elsewhere.
  - Treat the purchase as optional and Level 4's action as flavour text:
    rejected — it leaves canon saying something untrue about its own
    completion rule, which is how canon rots.
  - Emit only BOARD_SECTION_UNLOCKED and let the UI infer the offer:
    rejected. The button appearing on its own tells the player nothing
    about why, and analytics could not distinguish "was offered and
    declined" from "was never offered" — which is exactly the funnel
    question the section costs will need answering.
CONSEQUENCES:
  - `BoardExpansionSystem` gains `start()` and joins the event-driven
    systems. It subscribes to LAB_UPGRADED, PLAYER_LEVELED and
    CHAPTER_UNLOCKED — precisely the events that can move an unlock
    condition — and emits an offer when one lands.
  - `start()` seeds itself from the loaded save, so a reload does not
    re-announce an offer the player already saw. Announcing on a live
    transition and staying quiet on load is the difference between news
    and noise.
  - `AnalyticsBridge` maps the offer to `content_unlocked`, the event
    canon §48 requires. The purchase keeps its own mapping.
  - The player is now told a section opened, and at what price, instead
    of finding a new button.
  - Gap-analysis conflict "canon §4 cannot express canon §10" is closed
    by decision. The open SPEND_ENERGY conflict is NOT closed by this —
    it is the same *shape*, but Level 3 genuinely asks the player to spend
    energy, and no other canon section grants it.
MIGRATION:
  None. No save field, content field or existing event payload changed;
  `BOARD_SECTION_OFFERED` is additive.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-27
```
