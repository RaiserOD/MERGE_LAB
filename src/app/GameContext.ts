import { GameState } from "@domain/GameState";
import type { ItemRegistry } from "@domain/items/ItemRegistry";
import type { GeneratorRegistry } from "@domain/generators/GeneratorRegistry";
import type { OrderRegistry } from "@domain/orders/OrderRegistry";
import type { QuestRegistry } from "@domain/quests/QuestRegistry";
import type { DialogueRegistry } from "@domain/dialogues/DialogueRegistry";
import type { TutorialRegistry } from "@domain/tutorial/TutorialRegistry";
import type { ChapterRegistry, LabStageRegistry } from "@domain/progression/ChapterRegistry";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { BoardSystem } from "@systems/BoardSystem";
import { MergeSystem } from "@systems/MergeSystem";
import { EnergySystem } from "@systems/EnergySystem";
import { GeneratorSystem } from "@systems/GeneratorSystem";
import { EconomySystem } from "@systems/EconomySystem";
import { OrderSystem } from "@systems/OrderSystem";
import { ProgressionSystem } from "@systems/ProgressionSystem";
import { QuestSystem } from "@systems/QuestSystem";
import { DialogueSystem } from "@systems/DialogueSystem";
import { TutorialSystem } from "@systems/TutorialSystem";
import { SaveSystem } from "@infrastructure/persistence/SaveSystem";
import { SystemClock, type Clock } from "@infrastructure/clock/Clock";
import {
  loadChapterRegistry,
  loadGeneratorRegistry,
  loadItemRegistry,
  loadLabStageRegistry,
  loadOrderRegistry,
  loadQuestRegistry,
  loadDialogueRegistry,
  loadTutorialRegistry,
} from "@infrastructure/content/ContentLoader";
import { runtimeConfig } from "@config/runtime";

/**
 * Composition root: loads content, restores the save, and wires every
 * system to a shared event bus. Scenes consume this — they never build
 * systems themselves, and no Phaser type appears anywhere in the graph.
 */
export interface GameContextDeps {
  clock?: Clock;
  storage?: Storage;
}

export class GameContext {
  readonly state: GameState;
  readonly eventBus: EventBus<DomainEvent>;
  readonly items: ItemRegistry;
  readonly generators: GeneratorRegistry;
  readonly orders: OrderRegistry;
  readonly quests: QuestRegistry;
  readonly dialogues: DialogueRegistry;
  readonly tutorial: TutorialRegistry;
  readonly chapters: ChapterRegistry;
  readonly labStages: LabStageRegistry;
  readonly boardSystem: BoardSystem;
  readonly mergeSystem: MergeSystem;
  readonly energySystem: EnergySystem;
  readonly generatorSystem: GeneratorSystem;
  readonly economySystem: EconomySystem;
  readonly orderSystem: OrderSystem;
  readonly progressionSystem: ProgressionSystem;
  readonly questSystem: QuestSystem;
  readonly dialogueSystem: DialogueSystem;
  readonly tutorialSystem: TutorialSystem;
  readonly saveSystem: SaveSystem;

  private readonly stopHandlers: (() => void)[] = [];

  constructor(deps: GameContextDeps = {}) {
    const clock = deps.clock ?? new SystemClock();
    const storage = deps.storage ?? localStorage;

    this.items = loadItemRegistry();
    this.generators = loadGeneratorRegistry();
    this.orders = loadOrderRegistry();
    this.quests = loadQuestRegistry();
    this.dialogues = loadDialogueRegistry();
    this.tutorial = loadTutorialRegistry();
    this.chapters = loadChapterRegistry();
    this.labStages = loadLabStageRegistry();

    this.saveSystem = new SaveSystem(storage, clock);
    this.state = this.saveSystem.load();
    this.eventBus = new EventBus<DomainEvent>();

    this.boardSystem = new BoardSystem(this.state.board, this.items, this.eventBus);
    this.mergeSystem = new MergeSystem(this.state.board, this.items, this.eventBus);
    this.economySystem = new EconomySystem(this.state.currencies, this.eventBus);
    this.energySystem = new EnergySystem(
      this.state.currencies,
      clock,
      runtimeConfig.energyRegenPerSecond,
      this.eventBus,
    );
    this.generatorSystem = new GeneratorSystem(
      this.state.generators,
      this.generators,
      this.boardSystem,
      this.energySystem,
      this.eventBus,
      clock,
    );
    this.orderSystem = new OrderSystem(
      this.state.board,
      this.orders,
      this.economySystem,
      this.eventBus,
    );
    this.progressionSystem = new ProgressionSystem(
      this.state.player,
      this.state.progression,
      this.chapters,
      this.labStages,
      this.economySystem,
      this.eventBus,
    );
    this.questSystem = new QuestSystem(
      this.state.quests,
      this.quests,
      this.economySystem,
      this.eventBus,
    );
    this.dialogueSystem = new DialogueSystem(this.state.progression, this.dialogues, this.eventBus);
    this.tutorialSystem = new TutorialSystem(this.state.progression, this.tutorial, this.eventBus);
  }

  /** Attaches the event-driven systems. Call once, before gameplay starts. */
  start(): void {
    this.stopHandlers.push(
      this.progressionSystem.start(),
      this.questSystem.start(),
      this.tutorialSystem.start(),
    );
  }

  stop(): void {
    for (const stop of this.stopHandlers.splice(0)) {
      stop();
    }
  }

  save(): void {
    this.saveSystem.save(this.state);
  }
}
