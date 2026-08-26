import { test, expect } from "@playwright/test";

/**
 * Board geometry for an 800x900 viewport (see playwright.config.ts), computed
 * by the same formula as BoardView.layoutFor — kept here as literals rather
 * than importing the app's theme/config module, since Playwright's test
 * runner doesn't share Vite's path-alias resolution. If BoardView's layout
 * constants change, update these to match.
 */
const HUD_HEIGHT = 72;
const BANNER_HEIGHT = 42;
const FOOTER_HEIGHT = 88;
const BOARD_PADDING = 12;
const BOARD_COLS = 7;
const BOARD_ROWS = 9;
const VIEWPORT = { width: 800, height: 900 };

function cellCenter(col: number, row: number): { x: number; y: number } {
  const topReserved = HUD_HEIGHT + BANNER_HEIGHT;
  const availableWidth = VIEWPORT.width - BOARD_PADDING * 2;
  const availableHeight = VIEWPORT.height - topReserved - FOOTER_HEIGHT - BOARD_PADDING * 2;
  const cellSize = Math.floor(Math.min(availableWidth / BOARD_COLS, availableHeight / BOARD_ROWS));
  const boardWidth = cellSize * BOARD_COLS;
  const boardHeight = cellSize * BOARD_ROWS;
  const originX = Math.floor((VIEWPORT.width - boardWidth) / 2);
  const originY = Math.floor(topReserved + (availableHeight - boardHeight) / 2 + BOARD_PADDING);

  return { x: originX + col * cellSize + cellSize / 2, y: originY + row * cellSize + cellSize / 2 };
}

interface SaveData {
  currencies: { coins: number };
  board: { cells: { state: string }[] };
  progression: { completedTutorialStepIds: string[] };
}

async function readSave(page: import("@playwright/test").Page): Promise<SaveData> {
  const raw = await page.evaluate(() => localStorage.getItem("mergeLab.save"));
  if (!raw) {
    throw new Error("No save found in localStorage");
  }
  return JSON.parse(raw) as SaveData;
}

test.describe("Merge Lab smoke", () => {
  test("boots, merges the starter items, and completes the first tutorial step with no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    page.on("pageerror", (error) => {
      errors.push(String(error));
    });

    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.waitForTimeout(500);

    // The chapter-intro dialogue plays on first boot; click through its lines.
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2);
      await page.waitForTimeout(150);
    }

    const before = await readSave(page);
    const occupiedBefore = before.board.cells.filter((cell) => cell.state === "OCCUPIED").length;
    expect(occupiedBefore).toBe(2); // BootScene seeds two starter items.

    // Drag the item at (0,0) onto (1,0) to merge the two starter items.
    const from = cellCenter(0, 0);
    const to = cellCenter(1, 0);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const after = await readSave(page);
    const occupiedAfter = after.board.cells.filter((cell) => cell.state === "OCCUPIED").length;
    expect(occupiedAfter).toBe(1); // Two items merged into one.
    expect(after.progression.completedTutorialStepIds).toContain("tutorial.first_merge");

    expect(errors).toEqual([]);
  });
});
