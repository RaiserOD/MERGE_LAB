```text
ADR-ID: 0004
TITLE: Hierarchical AI memory layer over the master spec
STATUS: Accepted
NOTE:
  The consequence below about MASTER_SPEC.md being absent is resolved as
  of commit `e9efdaf`: the canon is now at docs/MASTER_SPEC.md. It is the
  20-level campaign canon, numbered by level, so the A5/A16/B2 references
  this ADR expected to resolve still do not — they came from an earlier
  spec revision. The decision itself is unaffected.
CONTEXT:
  Project knowledge lives almost entirely in one monolithic MASTER_SPEC
  document. Every AI-assisted task therefore either re-reads a large
  document that is mostly irrelevant to the task at hand, or works from
  whatever fragments survive in a conversation — the first is expensive and
  slow, the second is how invented mechanics and contradicted decisions get
  in. Neither degrades gracefully as the project grows.
  The problem is retrieval, not document length: an agent fixing MergeSystem
  needs the merge rules, the board contract and the relevant code, and
  needs nothing about monetization, PWA or narrative.
DECISION:
  - Add a memory layer over the spec rather than splitting the spec up.
    MASTER_SPEC stays canonical and whole; the new documents answer
    different questions ("what must I remember", "what already exists",
    "what am I doing", "which documents does this task need").
  - Four tiers, by how often they are needed:
      always loaded  — docs/ai/PROJECT_MEMORY.md, docs/ai/AI_RULES.md
      per task       — docs/ai/CURRENT_STATE.md, docs/ai/ACTIVE_TASK.md
      retrieval map  — docs/ai/CONTEXT_MAP.md
      on demand      — docs/architecture/, docs/design/, docs/qa/, ADRs
  - The always-loaded tier is the root CLAUDE.md, which imports
    PROJECT_MEMORY and AI_RULES via `@path` and routes to the rest. This
    matters: CLAUDE.md is the only file the tooling loads automatically, so
    a memory file that is not reachable from it is a file nobody reads.
    Both imports are kept small on purpose — they are paid for on every
    single turn.
  - CONTEXT_MAP maps task area -> spec section, docs, source files, tests,
    relevant ADRs. It is the actual token saving: a scoped task loads its
    row instead of the tree.
  - Source-of-truth precedence is fixed and written down: MASTER_SPEC > ADR
    > architecture/design/qa docs > CURRENT_STATE > code > AI assumptions.
    On a conflict an agent reports it rather than picking a side, because
    silently reconciling a doc to accidental code is how canon rots.
  - Documents point at contracts; they do not restate them.
    data-contracts.md names the Zod schema files and the rules for changing
    them rather than copying type definitions that would drift within a
    sprint.
  - The design and QA documents describe what is *built*, and say plainly
    where the implementation is thin, unvalidated or undecided. A document
    that describes the intended game as though it exists is worse than no
    document, because an agent will code against it.
  - No vector database, embeddings, or RAG service. At this size, ordinary
    Markdown in Git with a hand-written map is both cheaper and more
    reliable, and it stays reviewable in a diff. Revisit if the docs reach
    a scale where a human can no longer maintain the map.
ALTERNATIVES:
  - One large AI_CONTEXT.md: rejected — it recreates the monolith problem
    one level down, and grows without bound.
  - Splitting MASTER_SPEC into many files: rejected — canon derives its
    value from being one reviewable document with stable section numbers
    that other documents cite; fragmenting it makes "what does the spec
    say" unanswerable.
  - Embeddings / semantic retrieval over the docs now: rejected as
    premature. It adds infrastructure to maintain, and its failure mode
    (plausible-but-wrong chunks) is exactly the failure mode this layer
    exists to prevent.
  - Generating CURRENT_STATE from git history automatically: rejected for
    now — commit messages record what changed, not what is unverified,
    thin, or blocked on a decision, which is most of that document's value.
CONSEQUENCES:
  - CURRENT_STATE.md is the load-bearing risk. It is trusted, so a stale
    entry actively misleads. Updating it is in AI_RULES' after-coding
    checklist and in the PR template, but nothing enforces it mechanically;
    if it drifts in practice, a CI check that fails a src/ change touching
    no state update is the next step.
  - The documents duplicate facts that also live in code (event lists,
    layer rules, content counts). Duplication was accepted only where it
    buys navigation; anything precise enough to drift silently was left as
    a pointer instead.
  - MASTER_SPEC.md is not in this repository, so the top of the precedence
    chain is currently unavailable and the spec section references in
    CONTEXT_MAP (A5, A16, A23, ...) do not resolve. They are written
    against the canonical numbering and resolve as soon as the document is
    added at docs/MASTER_SPEC.md. Until then ADRs and code are the highest
    available authority — this is a real gap, not a formality.
  - Adding a new area to the codebase now has a documentation obligation: a
    CONTEXT_MAP row, or agents won't find it.
MIGRATION:
  N/A — additive. No code, build, or runtime behavior changes; this ADR
  adds documentation and a root CLAUDE.md.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-26
```
