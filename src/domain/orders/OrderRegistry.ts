import type { OrderDefinition } from "@domain/orders/OrderDefinition";

export class OrderRegistry {
  private readonly byId: Map<string, OrderDefinition>;

  constructor(definitions: readonly OrderDefinition[]) {
    this.byId = new Map();

    for (const definition of definitions) {
      if (this.byId.has(definition.id)) {
        throw new Error(`Duplicate order id in content: ${definition.id}`);
      }
      this.byId.set(definition.id, definition);
    }
  }

  getById(id: string): OrderDefinition | undefined {
    return this.byId.get(id);
  }

  requireById(id: string): OrderDefinition {
    const order = this.byId.get(id);
    if (!order) {
      throw new Error(`Unknown order id: ${id}`);
    }
    return order;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): readonly OrderDefinition[] {
    return [...this.byId.values()];
  }

  byChapter(chapterId: string): readonly OrderDefinition[] {
    return this.all().filter((order) => order.chapterId === chapterId);
  }
}
