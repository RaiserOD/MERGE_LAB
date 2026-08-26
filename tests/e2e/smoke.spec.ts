import { test, expect, type Page } from "@playwright/test";
import { layout } from "../../src/presentation/layout";
import { runtimeConfig } from "../../src/config/runtime";

/**
 * Board geometry, by the same formula as BoardView.layoutFor and from the
 * same constants — imported, not copied. Both modules are deliberately
 * import-free so this file can reach them without Vite's path aliases.
 *
 * The viewport comes from the browser rather than from a literal, so the
 * value in playwright.config.ts is the only place it is written down.
 */
interface Viewport {
  width: number;
  height: number;
}

function viewportOf(page: Page): Viewport {
  const size = page.viewportSize();
  if (!size) {
    throw new Error("Test needs a fixed viewport to compute board geometry");
  }
  return size;
}

function cellCenter(viewport: Viewport, col: number, row: number): { x: number; y: number } {
  const { hudHeight, bannerHeight, footerHeight, boardPadding } = layout;
  const { boardCols, boardRows } = runtimeConfig;

  const topReserved = hudHeight + bannerHeight;
  const availableWidth = viewport.width - boardPadding * 2;
  const availableHeight = viewport.height - topReserved - footerHeight - boardPadding * 2;
  const cellSize = Math.floor(Math.min(availableWidth / boardCols, availableHeight / boardRows));
  const boardWidth = cellSize * boardCols;
  const boardHeight = cellSize * boardRows;
  const originX = Math.floor((viewport.width - boardWidth) / 2);
  const originY = Math.floor(topReserved + (availableHeight - boardHeight) / 2 + boardPadding);

  return { x: originX + col * cellSize + cellSize / 2, y: originY + row * cellSize + cellSize / 2 };
}

interface SaveData {
  currencies: { coins: number };
  board: { cells: { state: string }[] };
  progression: { completedTutorialStepIds: string[] };
}

async function readSave(page: Page): Promise<SaveData> {
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

    const viewport = viewportOf(page);

    // The chapter-intro dialogue plays on first boot; click through its lines.
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(viewport.width / 2, viewport.height / 2);
      await page.waitForTimeout(150);
    }

    const before = await readSave(page);
    const occupiedBefore = before.board.cells.filter((cell) => cell.state === "OCCUPIED").length;
    expect(occupiedBefore).toBe(2); // BootScene seeds two starter items.

    // Drag the item at (0,0) onto (1,0) to merge the two starter items.
    const from = cellCenter(viewport, 0, 0);
    const to = cellCenter(viewport, 1, 0);
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
