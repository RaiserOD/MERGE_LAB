# Content pipeline

Canon is `docs/MASTER_SPEC.md` (A25). How content gets from a JSON file into
the running game, and what to do when adding some.

## Principle

Content is data, code is machinery. Adding an item, order, quest, dialogue or
chapter should require **no code change** — if it does, either the schema is
missing a field or you're adding a new _kind_ of thing, which is a different
(and larger) task.

## The path

```
content/<kind>/*.json
        │
        │  import.meta.glob(..., eager) — bundled at build time
        ▼
infrastructure/content/ContentLoader.ts
        │
        │  Zod .parse() — throws on malformed content
        ▼
domain/<kind>/<Kind>Registry
        │
        ▼
app/GameContext  →  systems
```

Content is bundled, not fetched: `ContentLoader` uses Vite's
`import.meta.glob` with `eager: true`, so every file in a content directory is
picked up automatically. **Adding a file to an existing directory needs no
registration** — dropping in `content/items/acid.json` is enough.

## Two gates

1. **`pnpm content:validate`** (`tools/content-validator/`, runs in CI) —
   parses every directory against its schema, then checks cross-references:
   unique IDs, resolvable `resultItemId` chains, generator outputs and order
   requirements naming real items, chapter references to real generators / lab
   stages / dialogues, quest filters naming real content, no circular chapter
   unlocks, and an unbroken 1..N lab-stage run.
2. **Runtime parse** — the same schemas run on load.

The validator is the one that gives a _useful_ error. A content mistake that
only surfaces at runtime is a validator gap worth closing.

## Adding content

| Task                                          | Work required                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| New item / order / quest / dialogue / chapter | Drop a JSON file in; run `pnpm content:validate`                              |
| New field on an existing kind                 | Schema (`src/domain/`), plus whatever reads it                                |
| New kind of content                           | Schema + registry + loader glob + validator rules + a system that consumes it |
| New quest _type_                              | Schema variant + a `QuestSystem` subscription                                 |

## ID rules

- Namespaced, lowercase, dot-separated: `item.water`, `gen.water_tap`,
  `order.first_sample`, `quest.discover_steam`, `chapter.basement`,
  `dialogue.basement_intro`, `tutorial.first_merge`.
- Unique across their kind — enforced by the validator.
- **Persisted.** Saves record item, chapter, dialogue, tutorial-step and
  generator IDs. Renaming one silently orphans that data in existing saves;
  see `docs/architecture/data-contracts.md`.

## Merge chains

An item declares its successor via `resultItemId`; the top of a chain sets
`maxLevel: true` and omits it. The validator checks the chain resolves. There
is no chain definition outside the item files themselves — that's deliberate,
so a chain can be extended by editing one file's `resultItemId` and adding the
new item.

## Empty directories

`content/economy/` and `content/localization/` exist with `.gitkeep` and no
schema behind them. They are placeholders for decisions not yet made — don't
infer a format from the directory name and start authoring into them.

`content/events/` was one of them and is gone. It sat next to the save's
`events: EventSave[]` slot and implied the two were wired together; they never
were, and neither has a format. The save slot stays (removing a persisted
field is a schema change); the directory comes back when temporary events are
actually designed, together with the schema that makes it loadable.

## Current volume

2 items (one merge chain: Water → Steam), 1 generator, 2 orders, 3 quests,
2 chapters, 5 dialogues, 4 tutorial steps, 5 lab stages. The pipeline is
complete; the game is small. Growing it is content
work, not engineering — but content that implies new mechanics (a second
merge chain that crosses groups, an order requiring an item no generator can
reach) needs the design decision first.
