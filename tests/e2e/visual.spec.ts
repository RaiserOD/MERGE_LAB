import { test } from "@playwright/test";

/**
 * Screenshot capture for human review, attached to the HTML report — not
 * pixel-diff regression against a baseline. See ADR-0002 for why: a
 * baseline generated on one machine/OS/GPU doesn't reliably match CI's
 * renderer, and this project has no process yet for generating baselines
 * from within CI itself.
 */
test.describe("Visual QA capture", () => {
  test("captures the initial board", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.waitForTimeout(500);

    await testInfo.attach("board-on-boot", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});
