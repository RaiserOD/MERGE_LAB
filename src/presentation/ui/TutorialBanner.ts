import Phaser from "phaser";
import type { GameContext } from "@app/GameContext";
import { layout, palette } from "@presentation/theme";

const BANNER_HEIGHT = 42;

/**
 * Persistent one-line hint for the current tutorial step, sitting just
 * under the HUD. It only reflects TutorialSystem state — the tutorial
 * advances from gameplay events, never from this view.
 */
export class TutorialBanner {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly instruction: Phaser.GameObjects.Text;
  private readonly unsubscribes: (() => void)[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly context: GameContext,
  ) {
    this.background = scene.add
      .rectangle(0, layout.hudHeight, 10, BANNER_HEIGHT, palette.highlight, 0.16)
      .setOrigin(0);

    this.instruction = scene.add.text(16, layout.hudHeight + 12, "", {
      color: palette.highlightText,
      fontSize: "14px",
    });

    for (const eventType of ["TUTORIAL_STEP_COMPLETED", "TUTORIAL_COMPLETED"] as const) {
      this.unsubscribes.push(
        context.eventBus.on(eventType, () => {
          this.refresh();
        }),
      );
    }

    this.refresh();
  }

  layoutFor(width: number): void {
    this.background.setSize(width, BANNER_HEIGHT);
    this.instruction.setWordWrapWidth(width - 32);
    this.refresh();
  }

  refresh(): void {
    const step = this.context.tutorialSystem.getCurrentStep();
    const visible = step !== undefined;

    this.background.setVisible(visible);
    this.instruction.setVisible(visible).setText(step?.instruction ?? "");
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribes.splice(0)) {
      unsubscribe();
    }
    this.background.destroy();
    this.instruction.destroy();
  }
}
