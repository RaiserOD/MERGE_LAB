import { describe, expect, it } from "vitest";
import { ItemDefinitionSchema } from "@domain/items/ItemDefinition";

describe("ItemDefinitionSchema", () => {
  it("accepts a valid item definition", () => {
    const result = ItemDefinitionSchema.safeParse({
      id: "item.water",
      mergeGroup: "chemistry.water",
      level: 1,
      displayName: "Water",
      rarity: "common",
      sellValue: 1,
      xpValue: 1,
      spriteKey: "item_water",
      resultItemId: "item.steam",
      sourceGeneratorIds: ["gen.water_tap"],
      tags: ["chemistry"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown rarity", () => {
    const result = ItemDefinitionSchema.safeParse({
      id: "item.water",
      mergeGroup: "chemistry.water",
      level: 1,
      displayName: "Water",
      rarity: "mythic",
      sellValue: 1,
      xpValue: 1,
      spriteKey: "item_water",
      sourceGeneratorIds: [],
      tags: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts an item with no sellValue — there is no selling mechanic", () => {
    const result = ItemDefinitionSchema.safeParse({
      id: "item.water",
      mergeGroup: "chemistry.water",
      level: 1,
      displayName: "Water",
      rarity: "common",
      xpValue: 1,
      spriteKey: "item_water",
      sourceGeneratorIds: [],
      tags: [],
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.sellValue).toBeUndefined();
  });

  it("still rejects a negative sellValue when one is given", () => {
    const result = ItemDefinitionSchema.safeParse({
      id: "item.water",
      mergeGroup: "chemistry.water",
      level: 1,
      displayName: "Water",
      rarity: "common",
      sellValue: -1,
      xpValue: 1,
      spriteKey: "item_water",
      sourceGeneratorIds: [],
      tags: [],
    });

    expect(result.success).toBe(false);
  });
});
