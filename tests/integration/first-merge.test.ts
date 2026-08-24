import { describe, expect, it } from "vitest";
import { GameState } from "@domain/GameState";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { BoardSystem } from "@systems/BoardSystem";
import { MergeSystem } from "@systems/MergeSystem";
import { SaveSystem } from "@infrastructure/persistence/SaveSystem";
import { testItems } from "../fixtures/testItems";
import { InMemoryStorage } from "../fixtures/InMemoryStorage";
import { FixedClock } from "../fixtures/FixedClock";

describe("First merge (integration)", () => {
  it("spawns two items, merges them, then survives a save/load round-trip", () => {
    const state = GameState.createNew();
    const registry = new ItemRegistry(testItems);
    const eventBus = new EventBus<DomainEvent>();
    const boardSystem = new BoardSystem(state.board, registry, eventBus);
    const mergeSystem = new MergeSystem(state.board, registry, eventBus);

    const discovered: DomainEvent[] = [];
    eventBus.on("ITEM_MERGED", (event) => discovered.push(event));

    const first = boardSystem.spawnItem("item.water");
    const second = boardSystem.spawnItem("item.water");
    expect(first).not.toEqual(second);

    const result = mergeSystem.merge(first, second);
    expect(result.resultItemId).toBe("item.steam");
    expect(discovered).toHaveLength(1);

    const saveSystem = new SaveSystem(new InMemoryStorage(), new FixedClock(5_000));
    saveSystem.save(state);
    const restored = saveSystem.load();

    expect(restored.board.getCell(second.x, second.y)).toMatchObject({
      state: "OCCUPIED",
      itemId: "item.steam",
    });
    expect(restored.board.getCell(first.x, first.y)).toMatchObject({ state: "EMPTY" });
  });
});
