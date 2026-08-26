# Monetization (as built)

Canon is `docs/MASTER_SPEC.md` (A17). **Nothing is monetized today.** This
page describes the machinery that exists and, more importantly, the decisions
that must be made before any of it does anything.

## Current behavior

The game ships with **zero ad and IAP surface**:

- `FeatureFlags` (`StaticFeatureFlags`) defaults `rewardedAds: false` and
  `iap: false`.
- `NoopRewardedAdAdapter` never grants a reward.
- `NoopBillingAdapter` never completes a purchase.

A build with the flags off has no ad SDK, no store connection, and no purchase
UI. That is the intended shipping state until a vendor decision is made.

## Architecture

`MonetizationService` (`src/application/services/`) is the **only** caller of
`RewardedAdAdapter` and `BillingAdapter`. Domain and systems never touch
either. It:

1. checks the relevant feature flag,
2. calls the adapter,
3. emits `REWARDED_AD_STARTED` / `REWARDED_AD_COMPLETED` or `IAP_STARTED` /
   `IAP_COMPLETED`,
4. returns an outcome — `"granted" | "not_granted" | "unavailable"` for ads,
   `"success" | "failed" | "unavailable"` for purchases.

`unavailable` is what a flag-off or missing-vendor build returns. Callers must
handle it; it is not an error state.

## What the service deliberately does not do

**It does not decide what a reward or a purchase grants.** There is no
catalog, no product table, no "watch an ad for 50 coins" mapping anywhere in
the code. That omission is intentional: granting is an economy design decision
(`economy.md`), and wiring a placeholder reward would bake in a number nobody
chose.

Whoever implements the catalog owns deciding, per placement and per product,
which currency moves and by how much — and that goes through `EconomySystem`
like everything else.

## Open decisions (all require human approval + an ADR)

| Decision              | Why it's blocking                                     |
| --------------------- | ----------------------------------------------------- |
| Ad network            | New SDK, new data processor, app-store disclosure     |
| Billing vendor        | Play Billing vs. a wrapper; affects the Android build |
| Rewarded placements   | Where an ad is offered, and what it grants            |
| IAP catalog           | Products, prices, and what each grants                |
| Gem faucet/sink       | Gems have neither today; premium currency needs both  |
| Player-facing consent | Privacy policy and consent flow before any tracking   |

Per ADR-0001 and `docs/ai/AI_RULES.md`, adding any third-party SDK is not an
implementation detail — it changes the app's data-processing surface and the
store listing.

## Constraints that survive whatever gets chosen

- Gameplay never calls a billing or ad SDK. If a scene needs a reward, it goes
  through `MonetizationService`.
- Every monetized path stays behind a feature flag, so it can be shipped dark
  and turned on without a rebuild path change.
- No monetization mechanic may make the game unwinnable without paying — the
  MVP is a single-player casual game, and hard paywalls aren't in the spec.
- Rewards are granted through `EconomySystem`, so the analytics and quest
  systems observe them like any other currency change.
