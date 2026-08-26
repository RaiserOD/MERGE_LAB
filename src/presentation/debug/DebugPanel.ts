import Phaser from "phaser";
import type { GameContext } from "@app/GameContext";
import { palette } from "@presentation/theme";

export interface DebugPanelHandlers {
  onStateChanged: () => void;
}

/**
 * Dev-only QA overlay: cheats for testers to reach late-game states without
 * grinding (add currency, refill energy, skip the tutorial, force-unlock the
 * next chapter, wipe the save). Never constructed in production — see the
 * `import.meta.env.DEV` guard at the call site in GameScene, which lets
 * Vite's build tree-shake this whole module out of production bundles.
 *
 * Mutates `context.state`/`context.eventBus` directly rather than adding
 * cheat-only escape hatches to the real systems, so ProgressionSystem etc.
 * stay exactly as strict in production as they are here.
 */
export class DebugPanel {
  private readonly toggleButton: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Container | undefined;
  private expanded = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly context: GameContext,
    private readonly handlers: DebugPanelHandlers,
  ) {
    this.toggleButton = this.createButton(0, 0, "QA", () => {
      this.expanded = !this.expanded;
      this.rebuild();
    });
  }

  layoutFor(width: number): void {
    this.toggleButton.setPosition(
      width - this.toggleButton.width / 2 - 12,
      this.toggleButton.height / 2 + 12,
    );
    this.rebuild();
  }

  destroy(): void {
    this.toggleButton.destroy(true);
    this.panel?.destroy(true);
  }

  private rebuild(): void {
    this.panel?.destroy(true);
    this.panel = undefined;
    if (!this.expanded) {
      return;
    }

    const actions: [string, () => void][] = [
      [
        "+100 coins",
        () => {
          this.grant("coins", 100);
        },
      ],
      [
        "+50 gems",
        () => {
          this.grant("gems", 50);
        },
      ],
      [
        "+20 research",
        () => {
          this.grant("researchPoints", 20);
        },
      ],
      [
        "Refill energy",
        () => {
          this.refillEnergy();
        },
      ],
      [
        "Skip tutorial",
        () => {
          this.skipTutorial();
        },
      ],
      [
        "Unlock next chapter",
        () => {
          this.unlockNextChapter();
        },
      ],
      [
        "Reset save",
        () => {
          this.resetSave();
        },
      ],
    ];

    const buttons = actions.map(([label, onClick], index) =>
      this.createButton(0, (index + 1) * 44, label, onClick),
    );

    this.panel = this.scene.add.container(this.toggleButton.x, this.toggleButton.y, buttons);
  }

  private grant(currency: "coins" | "gems" | "researchPoints", amount: number): void {
    this.context.economySystem.grant(currency, amount);
    this.handlers.onStateChanged();
  }

  private refillEnergy(): void {
    this.context.energySystem.refill();
    this.handlers.onStateChanged();
  }

  /** Marks every step complete in one shot rather than replaying each completion event. */
  private skipTutorial(): void {
    if (this.context.tutorialSystem.isCompleted()) {
      return;
    }

    for (const step of this.context.tutorial.all()) {
      if (!this.context.tutorialSystem.isStepCompleted(step.id)) {
        this.context.state.progression.completedTutorialStepIds.push(step.id);
      }
    }
    this.context.eventBus.emit({ type: "TUTORIAL_COMPLETED" });
    this.handlers.onStateChanged();
  }

  /** Bypasses unlock conditions entirely — this is the one place that's allowed to. */
  private unlockNextChapter(): void {
    const next = this.context.chapters
      .all()
      .find((chapter) => !this.context.progressionSystem.isChapterUnlocked(chapter.id));
    if (!next) {
      return;
    }

    this.context.state.progression.unlockedChapterIds.push(next.id);
    this.context.eventBus.emit({ type: "CHAPTER_UNLOCKED", chapterId: next.id });
    this.handlers.onStateChanged();
  }

  private resetSave(): void {
    if (!window.confirm("Reset all progress and reload?")) {
      return;
    }
    this.context.saveSystem.clear();
    window.location.reload();
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const text = this.scene.add
      .text(0, 0, label, { color: palette.text, fontSize: "13px" })
      .setOrigin(0.5);

    const width = Math.max(text.width + 20, 60);
    const height = 34;

    const body = this.scene.add
      .rectangle(0, 0, width, height, palette.panel, 0.95)
      .setStrokeStyle(1, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });

    body.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onClick);

    const container = this.scene.add.container(x, y, [body, text]);
    container.setSize(width, height);
    return container;
  }
}
