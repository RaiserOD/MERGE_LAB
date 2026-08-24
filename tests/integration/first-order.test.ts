import { describe, expect, it } from "vitest";
import { GameState } from "@domain/GameState";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import { GeneratorRegistry } from "@domain/generators/GeneratorRegistry";
import { OrderRegistry } from "@domain/orders/OrderRegistry";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { BoardSystem } from "@systems/BoardSystem";
import { MergeSystem } from "@systems/MergeSystem";
import { EnergySystem } from "@systems/EnergySystem";
import { GeneratorSystem } from "@systems/GeneratorSystem";
import { EconomySystem } from "@systems/EconomySystem";
import { OrderSystem } from "@systems/OrderSystem";
import { SaveSystem } from "@infrastructure/persistence/SaveSystem";
import { testItems } from "../fixtures/testItems";
import { testGenerators } from "../fixtures/testGenerators";
import { testOrders } from "../fixtures/testOrders";
import { InMemoryStorage } from "../fixtures/InMemoryStorage";
import { FixedClock } from "../fixtures/FixedClock";

describe("First order (integration)", () => {
  it("runs the full session loop: generate, merge, fulfil an order, then persist", () => {
    const state = GameState.createNew();
    const clock = new FixedClock(0);
    const eventBus = new EventBus<DomainEvent>();

    const boardSystem = new BoardSystem(state.board, new ItemRegistry(testItems), eventBus);
    const mergeSystem = new MergeSystem(state.board, new ItemRegistry(testItems), eventBus);
    const energySystem = new EnergySystem(state.currencies, clock, 0, eventBus);
    const economySystem = new EconomySystem(state.currencies, eventBus);
    const generatorSystem = new GeneratorSystem(
      state.generators,
      new GeneratorRegistry(testGenerators),
      boardSystem,
      energySystem,
      eventBus,
      clock,
    );
    const orderSystem = new OrderSystem(
      state.board,
      new OrderRegistry(testOrders),
      economySystem,
      eventBus,
    );

    const completedOrders: DomainEvent[] = [];
    eventBus.on("ORDER_COMPLETED", (event) => completedOrders.push(event));

    // Generate two water items (2 energy each), then merge them into steam.
    const first = generatorSystem.use("gen.water_tap");
    const second = generatorSystem.use("gen.water_tap");
    expect(state.currencies.energy).toBe(96);

    mergeSystem.merge(first.position, second.position);
    expect(state.board.getCell(second.position.x, second.position.y)).toMatchObject({
      itemId: "item.steam",
    });

    // The steam order is now fulfillable.
    expect(orderSystem.canComplete("order.first_sample")).toBe(true);
    orderSystem.complete("order.first_sample");

    expect(state.currencies.coins).toBe(25);
    expect(state.currencies.researchPoints).toBe(1);
    expect(completedOrders).toHaveLength(1);
    expect(state.board.getCell(second.position.x, second.position.y)).toMatchObject({
      state: "EMPTY",
    });

    // Everything survives a save/load round-trip, generator cooldown included.
    const saveSystem = new SaveSystem(new InMemoryStorage(), clock);
    saveSystem.save(state);
    const restored = saveSystem.load();

    expect(restored.currencies.coins).toBe(25);
    expect(restored.currencies.energy).toBe(96);
    expect(restored.generators).toEqual(state.generators);
  });
});
