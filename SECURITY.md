# Security Policy

## Reporting a vulnerability

If you find a security issue in this repository, please open a private
report via GitHub's "Report a vulnerability" flow on the Security tab
instead of a public issue. We aim to acknowledge reports within 5 business
days.

## Trust model (MVP)

Merge Lab's MVP ships as a client-only web/PWA game with no backend and no
PvP/leaderboards (see docs ADR-0001). This has direct security
consequences that are accepted by design, not oversights:

- **Save data is player-controlled.** `SaveDataV1` lives in `localStorage`
  and can be edited by the player. There is no server-authoritative economy
  in MVP. All save data is still schema-validated (Zod) on load to reject
  malformed/corrupted data, but schema-valid tampering (e.g. inflating
  `coins`) is an accepted MVP risk, not a bug. If server-authoritative
  economy is needed later, `SaveDataV1`'s versioning makes that migration
  additive rather than a rewrite.
- **No secrets belong in the client bundle.** Anything shipped to `dist/`
  is public. Ads/analytics/billing SDK keys that must stay server-side
  belong in a backend that does not exist yet in MVP — do not add them to
  `src/` or `.env` files that get bundled.

## Rules enforced by tooling

- `domain/**` may not import Phaser (ESLint `no-restricted-imports`).
- Third-party SDKs (ads, analytics, billing) may only be loaded from
  `src/infrastructure/**`, never from gameplay/domain code.
- Dependencies are pinned via `pnpm-lock.yaml`; `pnpm audit` and secret
  scanning run in CI on every push.
- Content Security Policy is set in `index.html`; loosen it only when
  actually wiring a specific third-party SDK, and scope it to that SDK's
  origin.
