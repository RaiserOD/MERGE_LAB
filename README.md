# Merge Lab

Merge-2 / collection / light-simulation game. The player restores an
abandoned laboratory by generating, merging and discovering materials.
Full product/design/technical spec: see the master spec doc referenced in
`docs/`.

Platform roadmap: Web/PWA → Android → iOS. Stack: Phaser 3 + TypeScript +
Vite.

## Getting started

```bash
pnpm install
pnpm dev            # local dev server
pnpm test            # unit tests (Vitest)
pnpm lint            # ESLint
pnpm typecheck        # tsc -b --noEmit
pnpm content:validate # validate content/**/*.json against domain schemas
pnpm build            # production build
pnpm test:e2e         # Playwright end-to-end/visual QA (needs Chromium — see below)
```

`pnpm test:e2e` needs a Chromium build Playwright knows about. If you already
have one (e.g. `PLAYWRIGHT_BROWSERS_PATH` set), it's reused as-is; otherwise
run `pnpm exec playwright install --with-deps chromium` once first. CI does
this automatically in its own job.

Node version is pinned in `.nvmrc` (22). Package manager is pnpm — see
`packageManager` in `package.json`.

## Architecture

Layered, with a hard rule enforced by ESLint: **domain code never imports
Phaser**.

- `src/domain/` — pure game rules, content types, state models (no Phaser).
- `src/systems/` — commands/state transitions/orchestration.
- `src/application/` — command/handler/service wiring.
- `src/presentation/` — Phaser scenes, sprites, UI. The only layer allowed
  to import Phaser.
- `src/infrastructure/` — save, analytics, ads, billing, clock, random. The
  only layer allowed to talk to third-party SDKs or `localStorage`.
- `content/` — data-driven game content (items, generators, orders,
  quests, chapters, events, dialogues, economy, localization), validated by
  `tools/content-validator`.

See `docs/architecture/ADR/` for the decisions behind this structure,
starting with `0001-stack-and-trust-boundary.md`.

## Current state

The core loop is playable end to end: `pnpm dev` opens a board where you
drag items to merge them, run the generator, deliver orders, restore lab
stages, and follow a Professor-narrated tutorial through all of it — with
progress saved to `localStorage` between reloads.

Analytics is wired to the A24 event vocabulary via `AnalyticsBridge`, but
no vendor is chosen yet: the default adapter (`NoopAnalyticsAdapter`)
discards every event, so the game ships with zero analytics footprint
until that product decision is made.

Monetization (rewarded video + IAP) follows the same pattern:
`MonetizationService` gates both behind feature flags (`FeatureFlags`,
default off) and talks to `RewardedAdAdapter`/`BillingAdapter`. No ad
network or billing vendor is chosen yet, so the default `Noop*` adapters
never grant a reward or complete a purchase, and both flags stay off —
the game ships fully playable with zero ad/IAP surface until a vendor and
a rewards/product catalog are decided.

A dev-only QA panel (top-right "QA" toggle in `pnpm dev`) gives testers
cheats — add currency, refill energy, skip the tutorial, force-unlock the
next chapter, wipe the save — without grinding. It's tree-shaken out of
production builds entirely (`import.meta.env.DEV`-gated), so it ships with
zero footprint.

`pnpm test:e2e` runs Playwright against a real browser: a functional smoke
test (boot, merge, tutorial progress, zero console errors) plus a
screenshot capture attached to the HTML report for human review. It's not
pixel-diff regression yet — see `docs/architecture/ADR/
0002-playwright-visual-qa-scope.md` for why and what would change that.

The production build is a real installable, offline-capable PWA: `main.ts`
registers the service worker `vite-plugin-pwa` generates
(`registerType: "prompt"`), and a small DOM banner offers a reload when a
new version is waiting. Verified in a real browser: after the first visit,
going offline and reloading still boots the game from the service worker's
cache.

The Android build is a thin Capacitor shell around the same `dist/` output
web/PWA use (see `docs/architecture/ADR/0003-mobile-packaging.md`):
`pnpm cap:sync` builds and copies the web bundle into `android/`, and CI
builds a real debug APK (`./gradlew assembleDebug`) on every push. Not yet
verified: an actual boot on a device or emulator — this project's
environments have no Android SDK/emulator available to check that locally.

Not built yet (per the master spec's A26 staging): a live analytics
vendor, a real ad network/billing vendor and rewards/IAP catalog, an iOS
build (`@capacitor/ios`, deferred until there's an environment that can
build/verify it), temporary events, and real art/audio — items currently
render as rarity-tinted placeholder tiles.

## Security

See `SECURITY.md` for the trust model (client-only MVP, no server-side
economy) and the tooling rules that enforce it (dependency audit + secret
scanning in CI, CSP in `index.html`, the domain/Phaser import boundary).
