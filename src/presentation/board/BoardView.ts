import Phaser from "phaser";
import type { Board } from "@domain/board/Board";
import type { ItemRegistry } from "@domain/items/ItemRegistry";
import type { BoardPosition } from "@systems/events/DomainEvent";
import { layout, palette, rarityColors } from "@presentation/theme";

export interface BoardGeometry {
  readonly originX: number;
  readonly originY: number;
  readonly cellSize: number;
}

/**
 * Renders the board grid and its items. Read-only: it reflects domain
 * state and reports pointer intent, but never mutates the board — GameScene
 * routes every interaction through the systems.
 */
export class BoardView {
  private geometry: BoardGeometry = { originX: 0, originY: 0, cellSize: 0 };
  private readonly gridLayer: Phaser.GameObjects.Graphics;
  private readonly itemLayer: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly board: Board,
    private readonly items: ItemRegistry,
  ) {
    this.gridLayer = scene.add.graphics();
    this.itemLayer = scene.add.container(0, 0);
  }

  getGeometry(): BoardGeometry {
    return this.geometry;
  }

  /** Recomputes cell size for the current viewport — responsive on desktop and mobile. */
  layoutFor(width: number, height: number): void {
    // The banner strip is reserved whether or not it is currently showing,
    // so the board keeps the same position once the tutorial finishes.
    const topReserved = layout.hudHeight + layout.bannerHeight;
    const availableWidth = width - layout.boardPadding * 2;
    const availableHeight = height - topReserved - layout.footerHeight - layout.boardPadding * 2;

    const cellSize = Math.floor(
      Math.min(availableWidth / this.board.cols, availableHeight / this.board.rows),
    );
    const boardWidth = cellSize * this.board.cols;
    const boardHeight = cellSize * this.board.rows;

    this.geometry = {
      cellSize,
      originX: Math.floor((width - boardWidth) / 2),
      originY: Math.floor(topReserved + (availableHeight - boardHeight) / 2 + layout.boardPadding),
    };
  }

  cellCenter(position: BoardPosition): { x: number; y: number } {
    const { originX, originY, cellSize } = this.geometry;
    return {
      x: originX + position.x * cellSize + cellSize / 2,
      y: originY + position.y * cellSize + cellSize / 2,
    };
  }

  /** The cell under a screen point, or undefined when the point is outside the board. */
  cellAt(x: number, y: number): BoardPosition | undefined {
    const { originX, originY, cellSize } = this.geometry;
    if (cellSize <= 0) {
      return undefined;
    }

    const col = Math.floor((x - originX) / cellSize);
    const row = Math.floor((y - originY) / cellSize);

    return this.board.isValidCoordinate(col, row) ? { x: col, y: row } : undefined;
  }

  render(): void {
    this.drawGrid();
    this.drawItems();
  }

  private drawGrid(): void {
    const { originX, originY, cellSize } = this.geometry;
    this.gridLayer.clear();

    for (const cell of this.board.allCells()) {
      const x = originX + cell.x * cellSize;
      const y = originY + cell.y * cellSize;
      const inset = layout.cellGap / 2;
      // A locked cell is drawn as unlit lab floor rather than hidden, so the
      // player can see the space the laboratory will grow into (canon §39).
      const locked = cell.state === "LOCKED";

      this.gridLayer.fillStyle(locked ? palette.cellLocked : palette.cellEmpty, 1);
      this.gridLayer.lineStyle(1, locked ? palette.cellLockedStroke : palette.cellStroke, 1);
      this.gridLayer.fillRoundedRect(
        x + inset,
        y + inset,
        cellSize - layout.cellGap,
        cellSize - layout.cellGap,
        6,
      );
      this.gridLayer.strokeRoundedRect(
        x + inset,
        y + inset,
        cellSize - layout.cellGap,
        cellSize - layout.cellGap,
        6,
      );
    }
  }

  private drawItems(): void {
    this.itemLayer.removeAll(true);

    for (const cell of this.board.allCells()) {
      if (cell.state !== "OCCUPIED" || !cell.itemId) {
        continue;
      }
      this.itemLayer.add(this.createItemTile(cell.itemId, { x: cell.x, y: cell.y }));
    }
  }

  /** A single item tile. Public so GameScene can lift a copy while dragging. */
  createItemTile(itemId: string, position: BoardPosition): Phaser.GameObjects.Container {
    const definition = this.items.requireById(itemId);
    const { cellSize } = this.geometry;
    const size = cellSize - layout.cellGap * 2;
    const center = this.cellCenter(position);

    const container = this.scene.add.container(center.x, center.y);
    container.setData("itemId", itemId);
    container.setData("boardX", position.x);
    container.setData("boardY", position.y);

    const body = this.scene.add
      .rectangle(0, 0, size, size, rarityColors[definition.rarity], 1)
      .setStrokeStyle(2, 0xffffff, 0.18);

    const label = this.scene.add
      .text(0, 0, definition.displayName, {
        color: palette.text,
        fontSize: `${Math.max(9, Math.floor(size / 6))}px`,
        align: "center",
        wordWrap: { width: size - 8 },
      })
      .setOrigin(0.5);

    const level = this.scene.add
      .text(0, size / 2 - 10, `L${definition.level}`, {
        color: palette.textMuted,
        fontSize: `${Math.max(8, Math.floor(size / 8))}px`,
      })
      .setOrigin(0.5);

    container.add([body, label, level]);
    container.setSize(size, size);
    return container;
  }

  destroy(): void {
    this.gridLayer.destroy();
    this.itemLayer.destroy(true);
  }
}
