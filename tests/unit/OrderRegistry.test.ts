import { describe, expect, it } from "vitest";
import { OrderRegistry } from "@domain/orders/OrderRegistry";
import { steamOrder, testOrders } from "../fixtures/testOrders";

describe("OrderRegistry", () => {
  it("looks up orders by id", () => {
    const registry = new OrderRegistry(testOrders);

    expect(registry.getById("order.first_sample")).toEqual(steamOrder);
    expect(registry.has("order.unknown")).toBe(false);
  });

  it("throws on duplicate ids", () => {
    expect(() => new OrderRegistry([steamOrder, steamOrder])).toThrow(/Duplicate order id/);
  });

  it("filters orders by chapter", () => {
    const registry = new OrderRegistry(testOrders);

    const basementOrders = registry.byChapter("chapter.basement");
    expect(basementOrders.map((order) => order.id)).toEqual([
      "order.first_sample",
      "order.water_delivery",
    ]);
  });

  it("requireById throws for unknown ids", () => {
    const registry = new OrderRegistry(testOrders);
    expect(() => registry.requireById("order.unknown")).toThrow(/Unknown order id/);
  });
});
