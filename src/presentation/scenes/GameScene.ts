import Phaser from "phaser";
import type { GameContext } from "@app/GameContext";
import type { BoardPosition } from "@systems/events/DomainEvent";
import { MergeError } from "@systems/MergeSystem";
import { GeneratorError } from "@systems/GeneratorSystem";
import { OrderError } from "@systems/OrderSystem";
import { BoardView } from "@presentation/board/BoardView";
import { Hud } from "@presentation/ui/Hud";
import { ActionBar } from "@presentation/ui/ActionBar";
import { palette } from "@presentation/theme";
import { SCENE_KEYS } from "@presentation/scenes/BootScene";

interface GameSceneData {
  context: GameContext;
}

interface DragState {
  from: BoardPosition;
  ghost: Phaser.GameObjects.Container;
}

/**
 * Main play scene. Presentation reads domain state and dispatches intent to
 * systems — it never mutates the board itself, so every rule (merge
 * validity, energy cost, board space) stays enforced in one place.
 */
export class GameScene extends Phaser.Scene {
  private context!: GameContext;
  private boardView!: BoardView;
  private hud!: Hud;
  private actionBar!: ActionBar;
  private drag: DragState | undefined;

  constructor() {
    super(SCENE_KEYS.game);
  }

  init(data: GameSceneData): void {
    this.context = data.context;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(palette.background);

    this.boardView = new BoardView(this, this.context.state.board, this.context.items);
    this.hud = new Hud(this, this.context);
    this.actionBar = new ActionBar(this, this.context, {
      onUseGenerator: (generatorId) => {
        this.useGenerator(generatorId);
      },
      onCompleteOrder: (orderId) => {
        this.completeOrder(orderId);
      },
    });

    this.relayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown);
  }

  // Bound as fields so Phaser's emitter keeps `this` without a context arg.
  private readonly relayout = (): void => {
    const { width, height } = this.scale;
    this.boardView.layoutFor(width, height);
    this.boardView.render();
    this.hud.layoutFor(width);
    this.actionBar.layoutFor(width, height);
  };

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    const position = this.boardView.cellAt(pointer.x, pointer.y);
    if (!position) {
      return;
    }

    const cell = this.context.state.board.getCell(position.x, position.y);
    if (cell.state !== "OCCUPIED" || !cell.itemId) {
      return;
    }

    const ghost = this.boardView.createItemTile(cell.itemId, position);
    ghost.setAlpha(0.85).setScale(1.06).setDepth(1000);
    this.drag = { from: position, ghost };
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    this.drag?.ghost.setPosition(pointer.x, pointer.y);
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    const drag = this.drag;
    if (!drag) {
      return;
    }
    this.drag = undefined;
    drag.ghost.destroy(true);

    const target = this.boardView.cellAt(pointer.x, pointer.y);
    if (!target || (target.x === drag.from.x && target.y === drag.from.y)) {
      return;
    }

    this.resolveDrop(drag.from, target);
  };

  /** A drop is a merge when the target holds a mergeable partner, otherwise a move. */
  private resolveDrop(from: BoardPosition, to: BoardPosition): void {
    const targetCell = this.context.state.board.getCell(to.x, to.y);

    try {
      if (targetCell.state === "EMPTY") {
        this.context.boardSystem.moveItem(from, to);
      } else {
        const result = this.context.mergeSystem.merge(from, to);
        const item = this.context.items.getById(result.resultItemId);
        this.hud.setStatus(`Merged into ${item?.displayName ?? result.resultItemId}`);
      }
    } catch (error) {
      if (error instanceof MergeError) {
        this.hud.setStatus("These items can't be merged");
      } else {
        this.hud.setStatus(error instanceof Error ? error.message : String(error));
      }
      this.afterStateChange();
      return;
    }

    this.afterStateChange();
  }

  private useGenerator(generatorId: string): void {
    try {
      const result = this.context.generatorSystem.use(generatorId);
      const item = this.context.items.getById(result.outputItemId);
      this.hud.setStatus(`Produced ${item?.displayName ?? result.outputItemId}`);
    } catch (error) {
      this.hud.setStatus(
        error instanceof GeneratorError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error),
      );
    }
    this.afterStateChange();
  }

  private completeOrder(orderId: string): void {
    try {
      this.context.orderSystem.complete(orderId);
    } catch (error) {
      this.hud.setStatus(
        error instanceof OrderError ? "Order requirements are not met" : String(error),
      );
    }
    this.afterStateChange();
  }

  private afterStateChange(): void {
    this.boardView.render();
    this.hud.refresh();
    this.actionBar.refresh();
    this.context.save();
  }

  private readonly teardown = (): void => {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp);
    this.drag?.ghost.destroy(true);
    this.hud.destroy();
    this.actionBar.destroy();
    this.boardView.destroy();
  };
}
