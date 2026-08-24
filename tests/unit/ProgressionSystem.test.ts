import { beforeEach, describe, expect, it } from "vitest";
import type { CurrencySave, PlayerSave, ProgressionSave } from "@domain/save/SaveDataV1";
import { ChapterRegistry, LabStageRegistry } from "@domain/progression/ChapterRegistry";
import { xpForLevel } from "@domain/progression/LevelCurve";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { EconomySystem } from "@systems/EconomySystem";
import { ProgressionError, ProgressionSystem } from "@systems/ProgressionSystem";
import { testChapters, testLabStages } from "../fixtures/testProgression";

describe("ProgressionSystem", () => {
  let player: PlayerSave;
  let progression: ProgressionSave;
  let currencies: CurrencySave;
  let eventBus: EventBus<DomainEvent>;
  let emitted: DomainEvent[];
  let system: ProgressionSystem;

  beforeEach(() => {
    player = { level: 1, xp: 0 };
    progression = {
      labStage: 1,
      unlockedChapterIds: ["chapter.basement"],
      discoveredItemIds: [],
      seenDialogueIds: [],
      completedTutorialStepIds: [],
    };
    currencies = { coins: 0, gems: 0, researchPoints: 0, energy: 100, maxEnergy: 100 };
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    eventBus.on("PLAYER_LEVELED", (event) => emitted.push(event));
    eventBus.on("LAB_UPGRADED", (event) => emitted.push(event));
    eventBus.on("CHAPTER_UNLOCKED", (event) => emitted.push(event));

    system = new ProgressionSystem(
      player,
      progression,
      new ChapterRegistry(testChapters),
      new LabStageRegistry(testLabStages),
      new EconomySystem(currencies, eventBus),
      eventBus,
    );
  });

  it("accumulates XP without levelling until the threshold is crossed", () => {
    system.grantXp(5);

    expect(player.xp).toBe(5);
    expect(player.level).toBe(1);
    expect(emitted).toHaveLength(0);
  });

  it("levels the player up and emits PLAYER_LEVELED", () => {
    system.grantXp(xpForLevel(2));

    expect(player.level).toBe(2);
    expect(emitted).toEqual([{ type: "PLAYER_LEVELED", newLevel: 2, totalXp: xpForLevel(2) }]);
  });

  it("awards XP when an order completes", () => {
    const stop = system.start();

    eventBus.emit({
      type: "ORDER_COMPLETED",
      orderId: "order.first_sample",
      coinReward: 25,
      researchReward: 1,
      xpReward: 5,
    });

    expect(player.xp).toBe(5);
    stop();
  });

  it("records a first-time item as discovered and emits ITEM_DISCOVERED", () => {
    const discovered: DomainEvent[] = [];
    eventBus.on("ITEM_DISCOVERED", (event) => discovered.push(event));

    system.recordDiscovery("item.steam");

    expect(system.isDiscovered("item.steam")).toBe(true);
    expect(progression.discoveredItemIds).toEqual(["item.steam"]);
    expect(discovered).toEqual([{ type: "ITEM_DISCOVERED", itemId: "item.steam" }]);
  });

  it("treats a repeat sighting as a no-op", () => {
    const discovered: DomainEvent[] = [];
    eventBus.on("ITEM_DISCOVERED", (event) => discovered.push(event));

    system.recordDiscovery("item.steam");
    system.recordDiscovery("item.steam");

    expect(progression.discoveredItemIds).toEqual(["item.steam"]);
    expect(discovered).toHaveLength(1);
  });

  it("discovers items from spawn and merge events once started", () => {
    const stop = system.start();

    eventBus.emit({ type: "ITEM_SPAWNED", itemId: "item.water", position: { x: 0, y: 0 } });
    eventBus.emit({
      type: "ITEM_MERGED",
      consumedItemId: "item.water",
      resultItemId: "item.steam",
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    });

    expect(progression.discoveredItemIds).toEqual(["item.water", "item.steam"]);
    stop();
  });

  it("upgrades the lab, spending coins and emitting LAB_UPGRADED", () => {
    currencies.coins = 200;

    system.upgradeLab();

    expect(progression.labStage).toBe(2);
    expect(currencies.coins).toBe(50);
    expect(emitted).toContainEqual({
      type: "LAB_UPGRADED",
      newStage: 2,
      title: "Chemistry Lab",
      coinCost: 150,
    });
  });

  it("refuses an unaffordable upgrade without spending or advancing", () => {
    currencies.coins = 100;

    expect(() => {
      system.upgradeLab();
    }).toThrow(ProgressionError);
    expect(progression.labStage).toBe(1);
    expect(currencies.coins).toBe(100);
    expect(system.canUpgradeLab()).toBe(false);
  });

  it("refuses to upgrade past the highest configured stage", () => {
    currencies.coins = 10_000;
    system.upgradeLab();
    system.upgradeLab();

    expect(progression.labStage).toBe(3);
    expect(() => {
      system.upgradeLab();
    }).toThrow(/highest stage/);
  });

  it("unlocks a chapter once its conditions are met", () => {
    currencies.coins = 200;

    expect(system.canUnlockChapter("chapter.chemistry")).toBe(false);

    system.upgradeLab();

    expect(system.canUnlockChapter("chapter.chemistry")).toBe(true);
    system.unlockChapter("chapter.chemistry");
    expect(progression.unlockedChapterIds).toContain("chapter.chemistry");
    expect(emitted).toContainEqual({ type: "CHAPTER_UNLOCKED", chapterId: "chapter.chemistry" });
  });

  it("refuses to unlock a chapter whose conditions are unmet", () => {
    expect(() => {
      system.unlockChapter("chapter.chemistry");
    }).toThrow(ProgressionError);
    expect(progression.unlockedChapterIds).not.toContain("chapter.chemistry");
  });

  it("treats unlocking an already-unlocked chapter as a no-op", () => {
    system.unlockChapter("chapter.basement");

    expect(progression.unlockedChapterIds).toEqual(["chapter.basement"]);
    expect(emitted).toHaveLength(0);
  });

  it("evaluates playerLevel conditions", () => {
    expect(system.canUnlockChapter("chapter.level_gated")).toBe(false);

    system.grantXp(xpForLevel(3));

    expect(system.canUnlockChapter("chapter.level_gated")).toBe(true);
  });

  it("unlocks every eligible chapter in one sweep", () => {
    currencies.coins = 200;
    system.upgradeLab();
    system.grantXp(xpForLevel(3));

    const unlocked = system.unlockEligibleChapters();

    expect(unlocked).toEqual(["chapter.chemistry", "chapter.level_gated"]);
  });

  it("throws on an unsupported unlock condition rather than silently failing", () => {
    const registry = new ChapterRegistry([
      {
        id: "chapter.broken",
        title: "Broken",
        unlockConditions: ["someUnknownCondition"],
        availableItemGroups: [],
        availableGenerators: [],
        dialogueIds: [],
        labStage: 1,
      },
    ]);
    const broken = new ProgressionSystem(
      player,
      progression,
      registry,
      new LabStageRegistry(testLabStages),
      new EconomySystem(currencies, eventBus),
      eventBus,
    );

    expect(() => broken.canUnlockChapter("chapter.broken")).toThrow(/Unsupported unlock condition/);
  });
});
