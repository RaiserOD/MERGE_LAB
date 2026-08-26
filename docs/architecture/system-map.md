# System map

How the pieces fit together and who is allowed to call whom. For the shape of
the data crossing these boundaries, see `data-contracts.md`.

## Layers

```
        content/**.json          ← game content, data only
               │
               ▼
       infrastructure/content    ← loads + validates into registries
               │
               ▼
   ┌───────────────────────────────────────────┐
   │ domain/     pure rules, no side effects   │
   │             no Phaser, no I/O, no clock   │
   └───────────────────────────────────────────┘
               ▲                    │
               │ reads              │ mutates
               │                    ▼
   ┌───────────────────────────────────────────┐
   │ systems/    state transitions             │──── emits ──▶ EventBus
   │             one concern each              │
   └───────────────────────────────────────────┘
               ▲                                        │
               │ commands                               │ observes
               │                                        ▼
   ┌────────────────────────┐          ┌────────────────────────────┐
   │ presentation/ (Phaser) │          │ application/  services     │
   │ scenes, views, HUD     │          │ AnalyticsBridge            │
   └────────────────────────┘          │ MonetizationService        │
               │                       └────────────────────────────┘
               │                                        │
               ▼                                        ▼
   ┌───────────────────────────────────────────────────────────────┐
   │ infrastructure/   SaveSystem · Clock · analytics · ads ·       │
   │                   billing · flags · PWA                        │
   └───────────────────────────────────────────────────────────────┘
```

Direction is one-way: nothing below reaches up. Domain doesn't know systems
exist; systems don't know presentation exists.

## Who may call whom

| Layer             | May import                                         | Must not import                                            |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `domain/`         | `domain/`, `zod`                                   | Phaser, systems, application, presentation, infrastructure |
| `systems/`        | `domain/`, `systems/`                              | Phaser, presentation, application, third-party SDKs        |
| `application/`    | `domain/`, `systems/`, infrastructure _interfaces_ | Phaser, presentation                                       |
| `presentation/`   | Phaser, `app/`, `domain/` types, `systems/`        | infrastructure adapters directly                           |
| `infrastructure/` | third-party SDKs, `domain/` types                  | systems, presentation                                      |
| `app/`            | everything (composition root)                      | —                                                          |

The domain/systems/application → Phaser ban is machine-enforced in
`eslint.config.js`. The rest is convention and review.

## Composition root

`src/app/GameContext.ts` is the only place systems are constructed. It:

1. loads every registry from `content/` via `ContentLoader`,
2. restores `GameState` through `SaveSystem` (validating the save),
3. builds one `EventBus<DomainEvent>` and wires every system to it,
4. exposes systems as readonly fields for scenes to command.

Scenes never build systems, and no Phaser type appears anywhere in that
graph — which is what lets integration tests build a real `GameContext`
headlessly (see `tests/integration/`).

Dependencies that touch the outside world are injected through
`GameContextDeps` (`clock`, `storage`, `analytics`, `featureFlags`, `ads`,
`billing`), each defaulting to a real or Noop implementation. That's the seam
tests use.

## Event flow

Systems emit `DomainEvent` (see `src/systems/events/DomainEvent.ts`) **after**
a state change succeeds. Events describe what happened, never what should
happen — nothing in the bus is a command.

Emitters: `BoardSystem`, `MergeSystem`, `GeneratorSystem`, `EnergySystem`,
`EconomySystem`, `OrderSystem`, `ProgressionSystem`, `QuestSystem`,
`DialogueSystem`, `TutorialSystem`, `MonetizationService`.

Observers, attached by `GameContext.start()`:

| Observer            | Reacts to                                                | Does                                       |
| ------------------- | -------------------------------------------------------- | ------------------------------------------ |
| `ProgressionSystem` | merges, order completions                                | records discoveries, grants XP             |
| `QuestSystem`       | discoveries, orders, coin gains, generator use           | advances and completes quests              |
| `TutorialSystem`    | merges, discoveries, generator use, orders, lab upgrades | gates tutorial steps                       |
| `AnalyticsBridge`   | most of the union                                        | translates to the A24 analytics vocabulary |

This is why analytics, quests and tutorial add no calls to gameplay code: they
observe. Adding a new cross-cutting concern should follow the same shape.

## Ordering rule

An observer must not assume another observer ran first. Handlers are
independent; if two must happen in order, that ordering belongs inside one
system, not spread across two subscriptions.

## Boundaries worth restating

- `localStorage` → only `SaveSystem`.
- Wall-clock time → only through an injected `Clock`.
- Currency mutation → only `EconomySystem`.
- Energy mutation → only `EnergySystem`.
- Analytics SDK → only `AnalyticsBridge`.
- Ads/billing SDK → only `MonetizationService`, and only behind a
  `FeatureFlags` check.
