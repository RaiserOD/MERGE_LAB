import Phaser from "phaser";
import type { GameContext } from "@app/GameContext";
import { layout, palette } from "@presentation/theme";

/**
 * Top bar readout: currencies and energy, refreshed from domain
 * events rather than polled, plus a transient status line for action
 * feedback ("why did I get this reward", "why can't I merge these").
 */
export class Hud {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly currencyText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly unsubscribes: (() => void)[] = [];
  private statusTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly context: GameContext,
  ) {
    this.background = scene.add
      .rectangle(0, 0, 10, layout.hudHeight, palette.panel, 1)
      .setOrigin(0);

    this.currencyText = scene.add.text(16, 14, "", {
      color: palette.text,
      fontSize: "15px",
    });

    this.statusText = scene.add.text(16, 40, "", {
      color: palette.textMuted,
      fontSize: "13px",
    });

    for (const eventType of ["CURRENCY_CHANGED", "ENERGY_SPENT", "PLAYER_LEVELED"] as const) {
      this.unsubscribes.push(
        context.eventBus.on(eventType, () => {
          this.refresh();
        }),
      );
    }

    this.unsubscribes.push(
      context.eventBus.on("ORDER_COMPLETED", (event) => {
        this.setStatus(`Order complete: +${event.coinReward} coins, +${event.xpReward} XP`);
      }),
      context.eventBus.on("QUEST_COMPLETED", (event) => {
        this.setStatus(`Quest complete: ${event.questId}`);
      }),
      context.eventBus.on("ITEM_DISCOVERED", (event) => {
        const item = context.items.getById(event.itemId);
        this.setStatus(`Discovered: ${item?.displayName ?? event.itemId}`);
      }),
    );

    this.refresh();
  }

  layoutFor(width: number): void {
    this.background.setSize(width, layout.hudHeight);
  }

  setStatus(message: string): void {
    this.statusText.setText(message);
    this.statusTimer?.remove();
    this.statusTimer = this.scene.time.delayedCall(2600, () => {
      this.statusText.setText("");
    });
  }

  refresh(): void {
    const { coins, gems, researchPoints, maxEnergy } = this.context.state.currencies;
    const energy = Math.floor(this.context.energySystem.getEnergy());
    const { level } = this.context.state.player;

    this.currencyText.setText(
      `Lv ${level}   ⬤ ${coins}   ◆ ${gems}   ⬢ ${researchPoints}   ⚡ ${energy}/${maxEnergy}`,
    );
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribes.splice(0)) {
      unsubscribe();
    }
    this.statusTimer?.remove();
    this.background.destroy();
    this.currencyText.destroy();
    this.statusText.destroy();
  }
}
