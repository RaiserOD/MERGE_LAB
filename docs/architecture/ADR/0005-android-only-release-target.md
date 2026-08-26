```text
ADR-ID: 0005
TITLE: Android is the only release target; iOS stays reachable, not planned
STATUS: Accepted
AMENDS: ADR-0003 (mobile packaging)
CONTEXT:
  ADR-0003 and the README described the roadmap as "Web/PWA -> Android ->
  iOS", which reads as three committed platforms in sequence. That is no
  longer what is intended: the product ships on Android. iOS is a
  possibility to keep open, not a planned step, and stating it as a
  roadmap item commits the project to work nobody has decided to do — and
  quietly invites an agent to start doing it.
  The distinction matters more than wording. "Planned" means iOS-shaped
  work can be picked up on its own; "kept reachable" means the only
  obligation is to avoid decisions that would make iOS expensive later.
DECISION:
  - Android is the release platform. It is the one target with a build in
    CI, a native project in the repo, and a store listing in its future.
  - The web build is not a separate release commitment. It remains what it
    already is: the shared bundle every platform runs, the development and
    QA surface (`pnpm dev`, Playwright), and the PWA that Capacitor wraps.
    It stays installable and offline-capable because that costs nothing to
    keep and is genuinely useful for testing — but shipping it as a public
    web release is a decision nobody has made.
  - iOS is deliberately kept reachable and explicitly not planned. No
    `@capacitor/ios`, no `ios/` directory, no iOS CI job — none of that is
    added on speculation, and adding it later is `cap add ios`, additive
    and unblocked.
  - What "kept reachable" obliges, concretely — these are the constraints
    that make a future `cap add ios` cheap rather than a rewrite:
      * One bundle serves every platform. `capacitor.config.ts` keeps
        `webDir: "dist"`, and no platform-specific UI implementation is
        introduced.
      * No Android-only Capacitor plugin without an iOS equivalent, unless
        it is behind a capability check that degrades cleanly. A plugin
        with no iOS story is the single most likely thing to strand this.
      * No platform assumption in `src/domain/`, `src/systems/`, or
        `src/application/`. Anything Android-specific lives in `android/`
        or behind an infrastructure adapter, which is what the existing
        layer rules already require.
      * `appId` stays a valid reverse-DNS identifier — the same string
        form works as a Play package name and an App Store bundle ID.
      * Vendor choices still open (analytics, ads, billing) are not
        Android-only by accident. When one is picked, whether it has an
        iOS SDK is a criterion to note, not a discovery to make later.
  - The MVP non-goals list is unchanged. This narrows a platform
    commitment; it does not narrow the game.
ALTERNATIVES:
  - Keep "Web/PWA -> Android -> iOS": rejected — it describes commitments
    that don't exist, and the docs are read by agents that treat a roadmap
    as licence to build the next item on it.
  - Drop iOS from the docs entirely: rejected — silence is not the same as
    "deliberately kept possible". An undocumented option gets closed off
    by an ordinary-looking decision (an Android-only plugin, a
    platform-specific code path) that nobody recognises as consequential
    at the time. The constraints above only get honoured if they are
    written down.
  - Add `@capacitor/ios` now to prove the path works: rejected —
    `@capacitor/ios` needs Xcode/macOS to build or verify at all, and
    none of this project's environments have it. Adding an unbuildable,
    untestable platform directory is scaffolding that rots.
  - Remove the PWA/service worker as no longer a shipping channel:
    rejected — it is what Capacitor wraps and what the e2e tests drive.
    Removing it would cost the Android build its offline behaviour to
    save nothing.
CONSEQUENCES:
  - The roadmap in PROJECT_MEMORY.md and the README now reads "Android
    (web/PWA as the shared build; iOS possible, not planned)".
  - "A platform is added or dropped" remains an AI_RULES stop condition.
    Starting iOS work needs a PM decision and an ADR superseding this one
    — this ADR is what an agent should find when it wonders whether to.
  - Every constraint listed above is now reviewable: a PR adding an
    Android-only plugin or a platform-specific UI path is contradicting a
    recorded decision, not just making a judgement call.
  - Nothing about iOS is verified, because nothing about iOS exists. This
    ADR lowers the future cost; it does not evidence that a future iOS
    build works.
MIGRATION:
  N/A — documentation only. No code, build, or runtime behaviour changes;
  the Android build, the web build and the PWA all continue exactly as
  they are.
APPROVED_BY: alexd737@gmail.com
DATE: 2026-08-26
```
