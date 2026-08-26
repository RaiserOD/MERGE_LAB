# Mechanic specs

**STATUS: Proposed** — see `docs/design/mechanic-pipeline.md` and ADR-0005.
Nothing here is binding until that ADR is Accepted.

One file per mechanic. The process, the classification rules and the gates
are in `mechanic-pipeline.md`; the shape of a file is in `TEMPLATE.md`. This
page is the index — an agent working on `ML-MECH-002` loads
`PROJECT_MEMORY` → `CURRENT_STATE` → that one spec → the architecture docs it
names, and nothing else.

## Registry

| ID          | Title                   | Class | Status           | Chapter          |
| ----------- | ----------------------- | ----- | ---------------- | ---------------- |
| ML-MECH-001 | Restore Laboratory Wing | M3    | LIVE (retro-doc) | basement onwards |

## Shipped before this pipeline existed

These work today and have no spec. They are described "as built" in
`docs/design/game-design.md`, which stays the answer to "how does merging work
here?". Backfilling specs for them is optional and has not been decided:

merge · generators · energy · orders · quests · discovery · dialogue ·
tutorial · lab stages (spec'd above as the worked example).

Listing them here rather than silently starting at ML-MECH-002 keeps the index
honest about what it does and does not cover.

## Conventions

- **ID** — `ML-MECH-###`, allocated by taking the next free number in this
  table. Stable for the mechanic's whole life, never reused, never renumbered.
  Distinct from `ACTIVE_TASK.md`'s `ML-0##` task IDs: a mechanic is the design,
  a task is one unit of work, and one mechanic usually needs several tasks.
- **Filename** — `ML-MECH-###-kebab-title.md`, matching the ID.
- **Status** — `DRAFT → REVIEW → APPROVED → IMPLEMENTED → LIVE`, plus
  `REJECTED` / `SUPERSEDED`. Only the human PM sets `APPROVED`.
- **Rejected specs stay.** A rejected design is the cheapest possible record
  of a question already settled — deleting it invites the same proposal again.
- This table is the source of truth for what exists; keep it in sync in the
  same commit that adds or moves a spec.
