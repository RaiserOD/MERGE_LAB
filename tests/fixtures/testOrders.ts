import type { OrderDefinition } from "@domain/orders/OrderDefinition";

export const steamOrder: OrderDefinition = {
  id: "order.first_sample",
  chapterId: "chapter.basement",
  requirements: [{ itemId: "item.steam", quantity: 1 }],
  coinReward: 25,
  researchReward: 1,
  xpReward: 5,
};

export const waterOrder: OrderDefinition = {
  id: "order.water_delivery",
  chapterId: "chapter.basement",
  requirements: [{ itemId: "item.water", quantity: 2 }],
  coinReward: 10,
  researchReward: 0,
  xpReward: 2,
};

export const mixedOrder: OrderDefinition = {
  id: "order.mixed",
  chapterId: "chapter.chemistry",
  requirements: [
    { itemId: "item.water", quantity: 1 },
    { itemId: "item.dirt", quantity: 1 },
  ],
  coinReward: 5,
  researchReward: 0,
  xpReward: 1,
};

export const testOrders: OrderDefinition[] = [steamOrder, waterOrder, mixedOrder];
