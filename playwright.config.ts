import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end/visual QA (ML-036, per ADR-0001/0002). Scope for now is
 * functional assertions plus screenshot capture attached to the HTML
 * report for human review — not pixel-diff regression against a committed
 * baseline, since a baseline generated on one machine/OS doesn't reliably
 * match CI's renderer (see ADR-0002). `toHaveScreenshot` is a natural
 * follow-up once there's a process for generating baselines from CI itself.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec vite --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 800, height: 900 } },
    },
  ],
});
