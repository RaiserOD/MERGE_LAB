import type { PlayerSave, ProgressionSave } from "@domain/save/SaveDataV1";
import type { ItemRegistry } from "@domain/items/ItemRegistry";
import type { ChapterRegistry, LabStageRegistry } from "@domain/progression/ChapterRegistry";
import { levelForXp } from "@domain/progression/LevelCurve";
import { evaluateUnlockCondition, type UnlockContext } from "@domain/progression/UnlockCondition";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { EconomySystem } from "@systems/EconomySystem";

export class ProgressionError extends Error {}

/**
 * The three progression tracks from A11: player XP/level, laboratory stage
 * (bought with coins), and chapter unlocks.
 *
 * XP arrives by subscription rather than being pushed, so the systems that
 * produce it stay unaware of levelling. Canon §5 names merges, first
 * discoveries, orders and quests as sources; merges and orders are wired
 * here. Call `start()` once to attach the subscriptions.
 */
export class ProgressionSystem {
  constructor(
    private readonly player: PlayerSave,
    private readonly progression: ProgressionSave,
    private readonly items: ItemRegistry,
    private readonly chapters: ChapterRegistry,
    private readonly labStages: LabStageRegistry,
    private readonly economySystem: EconomySystem,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  /** Subscribes to the events progression reacts to. Returns an unsubscribe function. */
  start(): () => void {
    const unsubscribes = [
      this.eventBus.on("ORDER_COMPLETED", (event) => {
        this.grantXp(event.xpReward);
      }),
      this.eventBus.on("ITEM_SPAWNED", (event) => {
        this.recordDiscovery(event.itemId);
      }),
      this.eventBus.on("ITEM_MERGED", (event) => {
        // Canon §5 lists merges as an XP source. The value is the result
        // item's xpValue — content-defined, like every other XP amount.
        this.grantXp(this.items.requireById(event.resultItemId).xpValue);
        this.recordDiscovery(event.resultItemId);
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }

  isDiscovered(itemId: string): boolean {
    return this.progression.discoveredItemIds.includes(itemId);
  }

  /** Records a first sighting of an item and emits ITEM_DISCOVERED. Repeat sightings are a no-op. */
  recordDiscovery(itemId: string): void {
    if (this.isDiscovered(itemId)) {
      return;
    }

    this.progression.discoveredItemIds.push(itemId);
    this.eventBus.emit({ type: "ITEM_DISCOVERED", itemId });
  }

  grantXp(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(`XP amount must be a non-negative integer, got ${amount}`);
    }
    if (amount === 0) {
      return;
    }

    this.player.xp += amount;
    const newLevel = levelForXp(this.player.xp);

    if (newLevel > this.player.level) {
      this.player.level = newLevel;
      this.eventBus.emit({ type: "PLAYER_LEVELED", newLevel, totalXp: this.player.xp });
    }
  }

  getLabStage(): number {
    return this.progression.labStage;
  }

  canUpgradeLab(): boolean {
    const next = this.labStages.getByStage(this.progression.labStage + 1);
    return next !== undefined && this.economySystem.canAfford("coins", next.upgradeCost);
  }

  /** Spends coins to advance one lab stage. Throws without mutating if unaffordable or already maxed. */
  upgradeLab(): void {
    const nextStage = this.progression.labStage + 1;
    const next = this.labStages.getByStage(nextStage);

    if (!next) {
      throw new ProgressionError(
        `Lab is already at the highest stage (${this.progression.labStage})`,
      );
    }
    if (!this.economySystem.canAfford("coins", next.upgradeCost)) {
      throw new ProgressionError(
        `Need ${next.upgradeCost} coins to reach ${next.title}, only ${this.economySystem.getBalance("coins")} available`,
      );
    }

    this.economySystem.spend("coins", next.upgradeCost);
    this.progression.labStage = nextStage;

    this.eventBus.emit({
      type: "LAB_UPGRADED",
      newStage: nextStage,
      title: next.title,
      coinCost: next.upgradeCost,
    });
  }

  isChapterUnlocked(chapterId: string): boolean {
    return this.progression.unlockedChapterIds.includes(chapterId);
  }

  canUnlockChapter(chapterId: string): boolean {
    const chapter = this.chapters.requireById(chapterId);
    return chapter.unlockConditions.every((condition) => this.evaluateCondition(condition));
  }

  /** Unlocks a chapter whose conditions are met. Already-unlocked chapters are a no-op. */
  unlockChapter(chapterId: string): void {
    if (this.isChapterUnlocked(chapterId)) {
      return;
    }
    if (!this.canUnlockChapter(chapterId)) {
      throw new ProgressionError(`Unlock conditions for ${chapterId} are not met`);
    }

    this.progression.unlockedChapterIds.push(chapterId);
    this.eventBus.emit({ type: "CHAPTER_UNLOCKED", chapterId });
  }

  /** Unlocks every chapter whose conditions are now satisfied, returning the newly unlocked ids. */
  unlockEligibleChapters(): string[] {
    const unlocked: string[] = [];

    for (const chapter of this.chapters.all()) {
      if (!this.isChapterUnlocked(chapter.id) && this.canUnlockChapter(chapter.id)) {
        this.unlockChapter(chapter.id);
        unlocked.push(chapter.id);
      }
    }

    return unlocked;
  }

  /**
   * A live view of the progression facts unlock conditions are evaluated
   * against. Board sections use the same vocabulary, so the evaluator itself
   * lives in the domain (`UnlockCondition.ts`) and this is what feeds it.
   */
  unlockContext(): UnlockContext {
    const progression = this.progression;
    const player = this.player;

    return {
      get labStage(): number {
        return progression.labStage;
      },
      get playerLevel(): number {
        return player.level;
      },
      isChapterUnlocked: (chapterId: string) => this.isChapterUnlocked(chapterId),
    };
  }

  private evaluateCondition(condition: string): boolean {
    return evaluateUnlockCondition(condition, this.unlockContext());
  }
}
