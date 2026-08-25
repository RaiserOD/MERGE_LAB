import Phaser from "phaser";
import type { GameContext } from "@app/GameContext";
import { layout, palette } from "@presentation/theme";

export interface ActionBarHandlers {
  onUseGenerator: (generatorId: string) => void;
  onCompleteOrder: (orderId: string) => void;
  onUpgradeLab: () => void;
}

/** Bottom bar (A18): generator buttons, the first fulfillable order, and an affordable lab upgrade. */
export class ActionBar {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly buttons: Phaser.GameObjects.Container[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly context: GameContext,
    private readonly handlers: ActionBarHandlers,
  ) {
    this.background = scene.add
      .rectangle(0, 0, 10, layout.footerHeight, palette.panel, 1)
      .setOrigin(0);
  }

  layoutFor(width: number, height: number): void {
    const top = height - layout.footerHeight;
    this.background.setSize(width, layout.footerHeight).setPosition(0, top);
    this.rebuild(top);
  }

  refresh(): void {
    this.rebuild(this.background.y);
  }

  private rebuild(top: number): void {
    for (const button of this.buttons.splice(0)) {
      button.destroy(true);
    }

    let x = 16;
    for (const generator of this.context.generators.all()) {
      const state = this.context.generatorSystem.getState(generator.id);
      const outputName =
        this.context.items.getById(generator.outputItemId)?.displayName ?? generator.outputItemId;
      const label = `${outputName}  (${String(state.chargesRemaining)}/${String(generator.maxCharges)})`;

      const button = this.createButton(x, top + 16, label, () => {
        this.handlers.onUseGenerator(generator.id);
      });
      this.buttons.push(button);
      x += button.width + 12;
    }

    const readyOrder = this.context.orders
      .all()
      .find((order) => this.context.orderSystem.canComplete(order.id));

    if (readyOrder) {
      const button = this.createButton(
        x,
        top + 16,
        `Deliver order (+${String(readyOrder.coinReward)})`,
        () => {
          this.handlers.onCompleteOrder(readyOrder.id);
        },
      );
      this.buttons.push(button);
      x += button.width + 12;
    }

    const nextStage = this.context.labStages.getByStage(
      this.context.progressionSystem.getLabStage() + 1,
    );
    if (nextStage && this.context.progressionSystem.canUpgradeLab()) {
      const button = this.createButton(
        x,
        top + 16,
        `Restore ${nextStage.title} (-${String(nextStage.upgradeCost)})`,
        () => {
          this.handlers.onUpgradeLab();
        },
      );
      this.buttons.push(button);
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const text = this.scene.add
      .text(0, 0, label, { color: palette.text, fontSize: "14px" })
      .setOrigin(0.5);

    const width = text.width + 28;
    const height = 40;

    const body = this.scene.add
      .rectangle(0, 0, width, height, palette.highlight, 0.9)
      .setStrokeStyle(1, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });

    body.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onClick);

    const container = this.scene.add.container(x + width / 2, y + height / 2, [body, text]);
    container.setSize(width, height);
    return container;
  }

  destroy(): void {
    for (const button of this.buttons.splice(0)) {
      button.destroy(true);
    }
    this.background.destroy();
  }
}
