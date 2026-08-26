```text
ADR-ID: 0008
TITLE: Mechanic design pipeline and per-mechanic specifications
STATUS: Proposed
CONTEXT:
  PROJECT_MEMORY says "mechanics are never invented" and AI_RULES lists "a
  new mechanic is required" as a stop-and-ask. Neither says what an approved
  mechanic *is*, which document holds it, or how an agent distinguishes a
  new mechanic from new content. The rule is therefore enforceable only by
  stopping: an agent can refuse to invent, but has nowhere to put an
  approved design and no test for whether a design is complete enough to
  build.
  The gap shows up between two documents that both exist. narrative.md
  describes chapters and dialogue; game-design.md describes systems as
  built. Nothing connects them — there is no artifact between "chapter 2 is
  about chemistry" and a system appearing in src/systems/. For an
  AI-driven project that is the highest-risk seam in the repo, because the
  cheapest thing for an agent to do with an underspecified beat is to
  invent a mechanic that reads plausibly and contradicts nothing it loaded.
  MASTER_SPEC.md is still absent, so the pipeline cannot be added to canon
  where it arguably belongs; and the proposal that prompted this ADR
  assumed a spec numbering (A13 Story Architecture, A14 Chapter Design,
  A15 Events) that contradicts CONTEXT_MAP's (A13 Quests, A14-A15
  Narrative, A11-A12 Progression, A21-A22 Events). That conflict is
  reported here, not resolved.
DECISION:
  - Add docs/design/mechanic-pipeline.md: the process by which a narrative
    beat becomes an approved mechanic. It sits beside content-pipeline.md
    deliberately — one covers data becoming content, the other an idea
    becoming an approved mechanic.
  - Add docs/design/mechanics/: one spec per mechanic, ML-MECH-### IDs,
    an index README, a template, and one retro-documented worked example
    (ML-MECH-001, the lab wing restoration that already ships).
  - Classify before designing. M0 content / M1 configuration / M2 changed
    rule / M3 new player verb / M4 new system. M0 and M1 get no spec at
    all; M2 gets a short form; M3-M4 get the full form plus PM approval,
    and M4 additionally requires an ADR. Most narrative beats are M0-M1,
    and a process that taxes them will be abandoned.
  - Roles are hats worn in sequence by whoever does the work, not people.
    One agent may wear all of them; no agent approves its own design.
    Approval stays a human act, per AI_RULES' existing stop list.
  - Specs are written in this repo's vocabulary: system methods, DomainEvent
    variants, GameState and SaveDataV1 fields, content kinds and validator
    rules. Not commands and handlers — src/application/commands/ and
    handlers/ hold only .gitkeep, and introducing a command layer would
    itself be an architecture decision needing its own ADR.
  - A spec is written once, before the code, and records intent. It is not
    updated to track implementation; CURRENT_STATE.md remains the single
    place that says what exists.
  - Nothing in MASTER_SPEC is written or renumbered by this ADR. When canon
    lands, the pipeline gets a section anchor and this ADR is amended.
ALTERNATIVES:
  - Add the section to MASTER_SPEC.md as proposed (A14A): rejected for now,
    because the file does not exist in this repo and the proposed numbering
    conflicts with CONTEXT_MAP. Writing canon that cannot be reconciled
    with the map is worse than a doc-layer proposal that can be promoted.
  - One uniform mechanic-spec template for every change: rejected. The
    proposal's template is roughly sixty fields across fourteen sections.
    Applied to a new item or a second generator it costs more than the work
    it documents, which is how a process gets skipped and then ignored.
    Tiering by class is the whole reason this can survive contact.
  - Model beats as a new content kind (content/beats/*.json) so chapters
    reference them: rejected as premature. It is an M4 change — schema,
    registry, loader glob, validator rules, a consuming system — to solve a
    documentation problem. Beats stay documentation.
  - Track mechanic status in CURRENT_STATE.md only, with no per-mechanic
    files: rejected. It recreates the monolith problem ADR-0004 exists to
    avoid, and CURRENT_STATE is a journal of reality, not of intent.
  - Rules only, no catalog: OPEN, not rejected. Put the M0-M4
    classification in AI_RULES.md and add a MECHANIC_CLASS field to
    ACTIVE_TASK.md, and stop there. ACTIVE_TASK already carries GOAL,
    REQUIREMENTS, NON_REQUIREMENTS and ACCEPTANCE_CRITERIA, which is most of
    a short-form spec. Costs one edit and no retrieval weight; buys the part
    that actually closes the gap (an agent must classify before coding and
    stop at M3-M4). What it does not buy is a design artifact that outlives
    the task: ACTIVE_TASK is reset by design, so the reasoning survives only
    in git history and CURRENT_STATE. Right choice if the next months are
    content work and M3-M4 stays rare.
  - Chapter beat sheets instead of mechanic specs: OPEN, not rejected, and
    complementary. The project's actual bottleneck is content volume, not
    mechanics: every system is done, while content is 2 items, 1 generator,
    2 orders, 3 quests, 2 chapters. The next real work is chapter 2, which is
    almost entirely M0-M1. A per-chapter template (beat -> decision: content /
    existing mechanic / M2 / M3) is exercised ten times where a mechanic spec
    is exercised once, and the classification step lives naturally inside it.
    It does not answer "what is an approved mechanic" for M3-M4, so it pairs
    with the rules-only option rather than replacing this one.
  - Specs as machine-checked data: OPEN, deferred to phase 2. A structured
    header parsed by pnpm mechanics:validate in CI, checking that referenced
    systems, events, content IDs and test paths resolve. It is the only
    variant that does not rot, and it matches how everything else here is
    enforced. Deferred rather than rejected because tooling for a process
    with zero specs written is premature, and because a validator checks
    form, never whether a design is good.
  - Write MASTER_SPEC first: OPEN, and arguably the root fix, but not an
    agent's work. Canon cannot be authored by an agent without inventing it,
    which PROJECT_MEMORY forbids. A cheap intermediate does exist: a
    MASTER_SPEC index - section numbers and one line each, no content -
    which would make CONTEXT_MAP's A5/A16/A23 references resolve and settle
    the A14A numbering conflict for a fraction of the cost. Recommended
    independently of this ADR.
  - Do nothing: rejected. The status quo is enforceable only as a refusal,
    and the project is about to enter exactly the phase (content volume,
    chapters 2+) where the seam gets exercised.
CONSEQUENCES:
  - A real process cost on M2-M4 work: a design document and a human
    approval before code. That is the intended cost; the risk is that a
    solo PM under time pressure routes around it, and the mitigation is
    that M0-M1 — most work — is untouched.
  - Nothing is machine-checked. An unenforced process rots the way
    CURRENT_STATE.md warns about. Phase 2 on approval is a
    pnpm mechanics:validate alongside tools/content-validator: unique
    well-formed IDs matching filenames, valid STATUS/CLASS, an ADR link for
    M4, referenced systems/events/content/tests resolving, and the README
    index matching disk. Building it before approval would be tooling for a
    process that may not be adopted.
  - Two ID spaces now exist: ML-MECH-### for mechanics and ML-0## for
    tasks. Documented in the index README; still a source of confusion.
  - AI_RULES.md and CONTEXT_MAP.md need edits to make the pipeline
    reachable — an agent does not read what nothing routes to. Only the
    CONTEXT_MAP row is included here, pointing at the proposal. The
    AI_RULES and PROJECT_MEMORY edits are deliberately left unmade until
    this ADR is Accepted, since they would read as binding rules.
  - The first M3-M4 mechanic carrying persistent state will need
    SaveDataV2 and a migration, and tools/save-migrator/ is an empty
    placeholder. Whichever variant is adopted, that debt is on the critical
    path of the first mechanic this process would govern - either close it
    first, or keep early mechanics off the save schema deliberately.
  - The spec-numbering conflict above stays open and is a question for the
    human PM.
MIGRATION:
  N/A - additive documentation. No code, build, content or runtime change.
  On acceptance: set STATUS to Accepted, add the AI_RULES hook (classify
  before implementing; M3/M4 need an approved spec), and decide phase 2.
APPROVED_BY: pending
DATE: 2026-08-26
```
