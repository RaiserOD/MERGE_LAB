import { beforeEach, describe, expect, it } from "vitest";
import { Board } from "@domain/board/Board";
import { OrderRegistry } from "@domain/orders/OrderRegistry";
import type { CurrencySave } from "@domain/save/SaveDataV1";
import { EventBus } from "@systems/events/EventBus";
import type { DomainEvent } from "@systems/events/DomainEvent";
import { EconomySystem } from "@systems/EconomySystem";
import { OrderError, OrderSystem } from "@systems/OrderSystem";
import { testOrders } from "../fixtures/testOrders";

describe("OrderSystem", () => {
  let board: Board;
  let currencies: CurrencySave;
  let eventBus: EventBus<DomainEvent>;
  let emitted: DomainEvent[];
  let orderSystem: OrderSystem;

  beforeEach(() => {
    board = Board.createEmpty(7, 9);
    currencies = { coins: 0, gems: 0, researchPoints: 0, energy: 100, maxEnergy: 100 };
    eventBus = new EventBus<DomainEvent>();
    emitted = [];
    eventBus.on("ORDER_COMPLETED", (event) => emitted.push(event));

    orderSystem = new OrderSystem(
      board,
      new OrderRegistry(testOrders),
      new EconomySystem(currencies, eventBus),
      eventBus,
    );
  });

  it("consumes the required item and grants coin/research rewards", () => {
    board.placeItem(3, 4, "item.steam");

    const result = orderSystem.complete("order.first_sample");

    expect(result).toEqual({
      orderId: "order.first_sample",
      coinReward: 25,
      researchReward: 1,
      xpReward: 5,
    });
    expect(board.getCell(3, 4)).toMatchObject({ state: "EMPTY" });
    expect(currencies.coins).toBe(25);
    expect(currencies.researchPoints).toBe(1);
    expect(emitted).toHaveLength(1);
  });

  it("consumes exactly the required quantity, leaving surplus items on the board", () => {
    board.placeItem(0, 0, "item.water");
    board.placeItem(1, 0, "item.water");
    board.placeItem(2, 0, "item.water");

    orderSystem.complete("order.water_delivery");

    const remaining = board.allCells().filter((cell) => cell.itemId === "item.water");
    expect(remaining).toHaveLength(1);
    expect(currencies.coins).toBe(10);
  });

  it("leaves board and balances untouched when requirements are not met", () => {
    board.placeItem(0, 0, "item.water");

    expect(() => orderSystem.complete("order.water_delivery")).toThrow(OrderError);
    expect(board.getCell(0, 0)).toMatchObject({ itemId: "item.water" });
    expect(currencies.coins).toBe(0);
    expect(emitted).toHaveLength(0);
  });

  it("does not partially consume a multi-requirement order it cannot finish", () => {
    board.placeItem(0, 0, "item.water");

    expect(() => orderSystem.complete("order.mixed")).toThrow(OrderError);
    expect(board.getCell(0, 0)).toMatchObject({ itemId: "item.water" });
    expect(currencies.coins).toBe(0);
  });

  it("completes a multi-requirement order once every item is present", () => {
    board.placeItem(0, 0, "item.water");
    board.placeItem(1, 0, "item.dirt");

    orderSystem.complete("order.mixed");

    expect(board.getCell(0, 0)).toMatchObject({ state: "EMPTY" });
    expect(board.getCell(1, 0)).toMatchObject({ state: "EMPTY" });
    expect(currencies.coins).toBe(5);
  });

  it("canComplete reports readiness without mutating anything", () => {
    expect(orderSystem.canComplete("order.first_sample")).toBe(false);

    board.placeItem(0, 0, "item.steam");

    expect(orderSystem.canComplete("order.first_sample")).toBe(true);
    expect(board.getCell(0, 0)).toMatchObject({ itemId: "item.steam" });
    expect(currencies.coins).toBe(0);
  });

  it("throws for an unknown order id", () => {
    expect(() => orderSystem.complete("order.unknown")).toThrow(/Unknown order id/);
  });
});
