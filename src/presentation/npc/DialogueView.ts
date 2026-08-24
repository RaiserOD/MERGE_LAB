import Phaser from "phaser";
import { speakerDisplayNames } from "@domain/dialogues/DialogueDefinition";
import type { GameContext } from "@app/GameContext";
import { palette } from "@presentation/theme";

const PANEL_HEIGHT = 172;
const DEPTH = 2000;

/**
 * Full-screen dialogue overlay. It renders whatever DialogueSystem says is
 * on screen and reports taps back to it — the system owns the cursor, this
 * only draws it.
 *
 * The scrim covers the whole viewport and swallows pointer input, so board
 * drags can't start underneath an open dialogue.
 */
export class DialogueView {
  private readonly container: Phaser.GameObjects.Container;
  private readonly scrim: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly speakerText: Phaser.GameObjects.Text;
  private readonly lineText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly unsubscribes: (() => void)[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly context: GameContext,
  ) {
    this.scrim = scene.add
      .rectangle(0, 0, 10, 10, 0x000000, 0.55)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    this.panel = scene.add.rectangle(0, 0, 10, PANEL_HEIGHT, palette.panel, 1).setOrigin(0);

    this.speakerText = scene.add.text(0, 0, "", {
      color: palette.highlightText,
      fontSize: "15px",
      fontStyle: "bold",
    });

    this.lineText = scene.add.text(0, 0, "", {
      color: palette.text,
      fontSize: "15px",
      lineSpacing: 6,
    });

    this.hintText = scene.add.text(0, 0, "Tap to continue", {
      color: palette.textMuted,
      fontSize: "12px",
    });

    this.container = scene.add
      .container(0, 0, [this.scrim, this.panel, this.speakerText, this.lineText, this.hintText])
      .setDepth(DEPTH)
      .setVisible(false);

    this.scrim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.context.dialogueSystem.advance();
    });

    for (const eventType of ["DIALOGUE_STARTED", "DIALOGUE_ADVANCED"] as const) {
      this.unsubscribes.push(
        context.eventBus.on(eventType, () => {
          this.refresh();
        }),
      );
    }
    this.unsubscribes.push(
      context.eventBus.on("DIALOGUE_COMPLETED", () => {
        this.refresh();
      }),
    );
  }

  isOpen(): boolean {
    return this.container.visible;
  }

  layoutFor(width: number, height: number): void {
    const top = height - PANEL_HEIGHT;

    this.scrim.setSize(width, height);
    this.panel.setSize(width, PANEL_HEIGHT).setPosition(0, top);
    this.speakerText.setPosition(20, top + 18);
    this.lineText.setPosition(20, top + 44).setWordWrapWidth(width - 40);
    this.hintText.setPosition(20, top + PANEL_HEIGHT - 26);

    this.refresh();
  }

  refresh(): void {
    const active = this.context.dialogueSystem.getActive();
    if (!active) {
      this.container.setVisible(false);
      return;
    }

    const speakerName = speakerDisplayNames[active.line.speaker];
    this.speakerText.setText(speakerName);
    this.lineText.setText(active.line.text);
    this.hintText.setText(active.isLastLine ? "Tap to begin" : "Tap to continue");
    this.container.setVisible(true);
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribes.splice(0)) {
      unsubscribe();
    }
    this.container.destroy(true);
  }
}
