/**
 * Screen layout constants, deliberately in their own module with **no
 * imports**.
 *
 * `BoardView.layoutFor` derives cell positions from these, and the
 * Playwright smoke test has to compute the same positions to drive a real
 * drag. It used to hard-code copies of these numbers, because it cannot
 * resolve the `@domain/*` alias that `theme.ts` pulls in — so a layout
 * change silently desynced the test, which then failed as if merging were
 * broken. Keeping these dependency-free lets the test import the real
 * values instead of copying them.
 */
export const layout = {
  hudHeight: 72,
  /**
   * Reserved for the tutorial banner. Always reserved, even after the
   * tutorial finishes, so the board doesn't reflow under the player.
   */
  bannerHeight: 42,
  footerHeight: 88,
  boardPadding: 12,
  cellGap: 4,
} as const;
