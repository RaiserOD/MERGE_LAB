```text
ADR-ID: 0007
TITLE: One shared ProgressionRequirement predicate for quests and levels
STATUS: Accepted
CONTEXT:
  Canon §4 specifies ProgressionRequirement, a ten-variant union of
  conditions on game state, used by campaign level completion. The
  implemented QuestDefinition carries a seven-variant union of its own.
  They overlap on six variants with identical meaning, and canon's own
  §41 uses the same names for quest progression — so the campaign layer
  would otherwise arrive with a second predicate vocabulary, a second
  evaluator and a second set of tests for conditions the game already
  knows how to check.
  The PM chose one shared predicate over two parallel types.
DECISION:
  - `ProgressionRequirement` lives in src/domain/progression/ and is the
    single vocabulary for "a condition on game state". QuestDefinition
    becomes identity + payout + one requirement; campaign levels will take
    a list of them, as canon writes it.
  - Counting predicates carry `target` and an optional filter. An absent
    filter matches everything, which is why canon's COMPLETE_ORDERS and
    DISCOVERIES_COUNT get no variant of their own — they are the
    unfiltered forms of COMPLETE_ORDER and DISCOVER_ITEM. Eight variants
    cover canon's ten.
  - UPGRADE_LAB takes canon's meaning: a *threshold* on the current lab
    stage, satisfied by being at it, not by a count of upgrades. Its field
    is `labStage`, not `target`, so the difference is visible at the call
    site rather than hidden in an evaluator.
  - SPEND_ENERGY is kept although canon §4 omits it, because canon's own
    Level 3 requires spending energy. This is the reported conflict, not a
    silent resolution: keeping it costs nothing and dropping it would make
    a canon level unimplementable.
  - UNLOCK_RESEARCH is deliberately NOT added. No research system exists
    to emit the event that satisfies it, and a predicate nothing can
    evaluate is worse than an absent one — it type-checks, passes
    validation and silently never completes. It lands with research.
  - Evaluation stays inside QuestSystem for now. It is the only consumer;
    the right shape for a shared evaluator will be obvious with two real
    callers and guessed with one.
ALTERNATIVES:
  - Two parallel types, as canon literally writes them: rejected by the PM
    and, on inspection, by the overlap — six of seven quest variants are
    the same predicate, so two types means two evaluators drifting apart
    on the same six conditions.
  - Keep QuestDefinition flat and share only the type names: rejected —
    string agreement without a shared type is the drift it looks like it
    prevents.
  - Extract a RequirementEvaluator now: rejected as premature. One
    consumer, one imagined consumer, and no way to tell which of its
    guesses are wrong until the second arrives.
CONSEQUENCES:
  - Quest content changes shape: `{type, target, filter}` becomes
    `{requirement: {type, target, filter}}`. Three content files, and the
    validator now reaches through `quest.requirement`.
  - **UPGRADE_LAB quests change meaning.** Previously `target: 2` meant
    "upgrade twice"; now `labStage: 2` means "reach stage 2". No content
    used the type, so nothing breaks today — and this is precisely why it
    is cheap now and would not be later.
  - COMPLETE_QUEST makes quests chainable, so a quest's payout can now
    trigger another's. Completion is guarded before the emit, so a chain
    cannot re-enter itself; the validator additionally rejects a quest
    requiring itself.
  - Campaign levels will not need new condition types for anything the
    game already tracks — only UNLOCK_RESEARCH, when research exists.
MIGRATION:
  Content-only, and applied in this change: the three quest files were
  reshaped. No save field holds a requirement, so no save migration.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-26
```
