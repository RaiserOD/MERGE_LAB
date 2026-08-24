import type { Board } from "@domain/board/Board";
import type { OrderDefinition } from "@domain/orders/OrderDefinition";
import type { OrderRegistry } from "@domain/orders/OrderRegistry";
import type { BoardPosition, DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";
import type { EconomySystem } from "@systems/EconomySystem";

export class OrderError extends Error {}

export interface CompleteOrderResult {
  readonly orderId: string;
  readonly coinReward: number;
  readonly researchReward: number;
  readonly xpReward: number;
}

/**
 * Order completion (A9): validate -> consume items -> grant rewards -> emit.
 * Requirements are collected across the whole board before anything is
 * removed, so an order the player can't afford leaves board and balances
 * untouched.
 *
 * XP is not granted here — ORDER_COMPLETED carries xpReward and
 * ProgressionSystem owns player XP/levelling. Coins and research points go
 * through EconomySystem, which is the only system allowed to move
 * currencies (A16).
 */
export class OrderSystem {
  constructor(
    private readonly board: Board,
    private readonly registry: OrderRegistry,
    private readonly economySystem: EconomySystem,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  canComplete(orderId: string): boolean {
    const order = this.registry.requireById(orderId);
    return this.findRequiredPositions(order) !== undefined;
  }

  complete(orderId: string): CompleteOrderResult {
    const order = this.registry.requireById(orderId);

    const positions = this.findRequiredPositions(order);
    if (!positions) {
      throw new OrderError(`Board does not hold the items required by ${orderId}`);
    }

    for (const position of positions) {
      this.board.removeItem(position.x, position.y);
    }

    this.economySystem.grant("coins", order.coinReward);
    this.economySystem.grant("researchPoints", order.researchReward);

    this.eventBus.emit({
      type: "ORDER_COMPLETED",
      orderId: order.id,
      coinReward: order.coinReward,
      researchReward: order.researchReward,
      xpReward: order.xpReward,
    });

    return {
      orderId: order.id,
      coinReward: order.coinReward,
      researchReward: order.researchReward,
      xpReward: order.xpReward,
    };
  }

  /** Positions satisfying every requirement, or undefined if the board falls short of any of them. */
  private findRequiredPositions(order: OrderDefinition): BoardPosition[] | undefined {
    const positions: BoardPosition[] = [];

    for (const requirement of order.requirements) {
      const matches = this.board
        .allCells()
        .filter((cell) => cell.state === "OCCUPIED" && cell.itemId === requirement.itemId)
        .slice(0, requirement.quantity);

      if (matches.length < requirement.quantity) {
        return undefined;
      }
      positions.push(...matches.map((cell) => ({ x: cell.x, y: cell.y })));
    }

    return positions;
  }
}
