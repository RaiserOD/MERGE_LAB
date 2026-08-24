import { z } from "zod";

/**
 * The seven quest types from A10. Each carries a numeric `target`; the
 * types that can be scoped to specific content carry an optional filter
 * (itemId / generatorId / orderId). Omitting the filter counts any
 * qualifying action — e.g. USE_GENERATOR with no generatorId counts every
 * generator use.
 */
const questRewardShape = {
  coinReward: z.number().int().nonnegative().default(0),
  gemReward: z.number().int().nonnegative().default(0),
  researchReward: z.number().int().nonnegative().default(0),
};

const questBaseShape = {
  id: z.string().min(1),
  title: z.string().min(1),
  target: z.number().int().positive(),
  ...questRewardShape,
};

export const QuestDefinitionSchema = z.discriminatedUnion("type", [
  z.object({ ...questBaseShape, type: z.literal("MERGE_COUNT") }),
  z.object({
    ...questBaseShape,
    type: z.literal("DISCOVER_ITEM"),
    itemId: z.string().min(1).optional(),
  }),
  z.object({
    ...questBaseShape,
    type: z.literal("COMPLETE_ORDER"),
    orderId: z.string().min(1).optional(),
  }),
  z.object({ ...questBaseShape, type: z.literal("EARN_COINS") }),
  z.object({ ...questBaseShape, type: z.literal("UPGRADE_LAB") }),
  z.object({
    ...questBaseShape,
    type: z.literal("USE_GENERATOR"),
    generatorId: z.string().min(1).optional(),
  }),
  z.object({ ...questBaseShape, type: z.literal("SPEND_ENERGY") }),
]);

export type QuestDefinition = z.infer<typeof QuestDefinitionSchema>;
export type QuestType = QuestDefinition["type"];
