# Acceptance criteria

Canon is `docs/MASTER_SPEC.md` (A27). What "done" means before a change lands,
and what a reviewer checks.

## Definition of done

A change is done when all of these hold:

1. `pnpm lint` — clean.
2. `pnpm typecheck` — clean.
3. `pnpm test` — green.
4. `pnpm build` — succeeds.
5. `pnpm content:validate` — clean, if content or a content schema changed.
6. `pnpm test:e2e` — green, if presentation or boot changed.
7. New behavior has a test that fails without the change.
8. `docs/ai/CURRENT_STATE.md` reflects the new reality.
9. Anything left unresolved is written down, not left in the author's head.

CI enforces 1–6 (`build`, `e2e`, `android`, `security` jobs). Nothing enforces
7–9 mechanically; they're the reviewer's job and the PR checklist's.

## Per-area criteria

**Domain / systems**

- No Phaser import (ESLint fails the build otherwise).
- No `Date.now()` — time comes from the injected `Clock`.
- No direct `localStorage`.
- State transitions are atomic: validate, then mutate, then emit.
- New `DomainEvent` variants are additive; changed payloads mean auditing
  every observer in `docs/architecture/system-map.md`.

**Content**

- Validator passes, including cross-references.
- No renamed ID without accounting for saves that recorded it.
- New content needs no code change, or the reason is stated.

**Save schema**

- Optional-with-default only while v1 is unreleased.
- Anything else means `SaveDataV2` + a migration + a test loading a real v1
  payload.

**Presentation**

- No gameplay logic in scenes; they render and dispatch.
- E2E smoke passes with **zero console errors**.
- Board layout constants live in `src/presentation/layout.ts` and are
  imported by both `BoardView` and the e2e test — don't reintroduce copies.

**Analytics / monetization**

- Only `AnalyticsBridge` calls the analytics adapter; only
  `MonetizationService` calls ads/billing.
- Monetized paths stay behind a `FeatureFlags` check and ship default-off.

## Playable acceptance (manual)

The loop a human should be able to run after a UI change, in one sitting from
a wiped save:

1. Boot → the Professor's basement intro plays.
2. Drag two Water samples together → they merge into Steam; the tutorial
   advances.
3. Use the Water Tap → energy drops, a new Water appears.
4. Deliver an order → coins arrive.
5. Restore the next wing → lab stage 2, chapter unlocked.
6. Reload the page → all of it persisted.
7. Go offline and reload → the game still boots (PWA).

Steps 1–6 are what the tutorial chain walks a new player through; step 7 is
the PWA acceptance check.

## Requires approval, not just review

Per `docs/ai/AI_RULES.md`, these are not "done when tests pass" — they're
blocked until a human decides and an ADR records it: new mechanics or
currencies, monetization behavior, architecture or layer changes, MVP-non-goal
scope, platform additions, narrative canon, new third-party SDKs, and changes
to documented invariants (board dimensions, save version).
