# PROJECT MEMORY

Short memory. Answers "what is this project and what rules are
non-negotiable?" Loaded into every session via the root `CLAUDE.md`, so it
stays deliberately small — details live in the documents `CONTEXT_MAP.md`
routes to.

## Identity

- **Name:** Merge Lab
- **Genre:** hybrid casual — merge-2 + collection + light simulation + narrative
- **Platform roadmap:** Web/PWA → Android → iOS
- **Stack:** Phaser 3 + TypeScript (strict) + Vite, pnpm, Node 22

## Product promise

Every merge discovers something new; every discovery makes the laboratory
stronger.

## Core loop

Generate → drag → merge → discover → reward

## Session loop

Generate → merge → fulfill order → earn → upgrade → unlock → continue

## Architecture

```
domain → systems → application → presentation
                 ↘ infrastructure
```

- `src/domain/` — pure rules, content types, state models. **Never imports Phaser.**
- `src/systems/` — state transitions, one system per concern, emit `DomainEvent`.
- `src/application/` — cross-cutting services that only observe events.
- `src/presentation/` — Phaser scenes/views. The only layer allowed to import Phaser.
- `src/infrastructure/` — save, clock, content I/O, analytics/ads/billing adapters.
  The only layer allowed to touch `localStorage` or a third-party SDK.

The domain/Phaser boundary is enforced by ESLint (`no-restricted-imports` in
`eslint.config.js`), not just by convention.

## Invariants

Break any of these and the change is wrong, however well it reads:

- Content is data (`content/**/*.json`), validated by Zod schemas in
  `src/domain/`; `pnpm content:validate` must pass.
- Persisted schemas are versioned (`SaveDataV1`) and validated on **load** —
  `localStorage` is untrusted player-controlled input.
- Game state transitions are deterministic; time comes from an injected
  `Clock`, never `Date.now()` inside domain or systems.
- Merge is atomic: validate fully, then mutate, then emit.
- Currency only changes through `EconomySystem`. Energy only through
  `EnergySystem`.
- `localStorage` is touched only by `SaveSystem`.
- Analytics is called only by `AnalyticsBridge`; ads/billing only by
  `MonetizationService`. Domain and systems call neither.
- Monetization is gated behind `FeatureFlags` and ships default-off.
- Mechanics are never invented. If it isn't in the spec, an ADR, or existing
  code, it needs human approval first.

## MVP non-goals

Multiplayer, PvP, guilds, chat, 3D, real-time networking, LLM-driven NPCs,
branching narrative, complex physics, procedural world generation. Proposing
any of these is a scope change, not an implementation detail.

## Source-of-truth precedence

When two sources disagree, the higher one wins — and the disagreement gets
**reported, not silently resolved**:

1. `docs/MASTER_SPEC.md` (canon)
2. `docs/architecture/ADR/` (decisions that amend or refine canon)
3. `docs/architecture/`, `docs/design/`, `docs/qa/`
4. `docs/ai/CURRENT_STATE.md`
5. source code
6. AI assumptions (lowest — never a basis for a design decision)

> **MASTER_SPEC is not currently checked into this repo.** It belongs at
> `docs/MASTER_SPEC.md`; section references throughout these docs (A5, A16,
> A23, B2…) are written against it and resolve once it lands. Until then,
> ADRs and code are the highest available authority, and anything canon-level
> that is genuinely unclear is a question for the human PM.

## Where to go next

- Status and what's in flight → `docs/ai/CURRENT_STATE.md`
- The task being worked right now → `docs/ai/ACTIVE_TASK.md`
- Which documents a given task needs → `docs/ai/CONTEXT_MAP.md`
- Working rules and the stop conditions → `docs/ai/AI_RULES.md`
