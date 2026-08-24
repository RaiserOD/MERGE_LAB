import { describe, expect, it } from "vitest";
import { ItemRegistry } from "@domain/items/ItemRegistry";
import { dirtItem, steamItem, testItems, waterItem } from "../fixtures/testItems";

describe("ItemRegistry", () => {
  it("looks up items by id and resolves merge results", () => {
    const registry = new ItemRegistry(testItems);

    expect(registry.getById("item.water")).toEqual(waterItem);
    expect(registry.getMergeResult("item.water")).toEqual(steamItem);
    expect(registry.getMergeResult("item.steam")).toBeUndefined();
  });

  it("throws on duplicate ids", () => {
    expect(() => new ItemRegistry([waterItem, waterItem])).toThrow(/Duplicate item id/);
  });

  it("throws when resultItemId does not resolve", () => {
    const broken = { ...waterItem, resultItemId: "item.nonexistent" };
    expect(() => new ItemRegistry([broken])).toThrow(/does not exist/);
  });

  it("requireById throws for unknown ids", () => {
    const registry = new ItemRegistry([dirtItem]);
    expect(() => registry.requireById("item.unknown")).toThrow(/Unknown item id/);
  });
});
