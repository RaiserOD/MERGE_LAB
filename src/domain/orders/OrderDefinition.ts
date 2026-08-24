import { z } from "zod";

export const OrderRequirementSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const OrderDefinitionSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  requirements: z.array(OrderRequirementSchema).min(1),
  coinReward: z.number().int().nonnegative(),
  researchReward: z.number().int().nonnegative(),
  xpReward: z.number().int().nonnegative(),
});

export type OrderRequirement = z.infer<typeof OrderRequirementSchema>;
export type OrderDefinition = z.infer<typeof OrderDefinitionSchema>;
