import { z } from "zod";
import { ProgressionRequirementSchema } from "@domain/progression/ProgressionRequirement";

/**
 * A quest is a `ProgressionRequirement` plus an identity and a payout
 *. The condition itself is the shared predicate, so quests and
 * campaign level requirements express the same things the same way and are
 * evaluated by the same rules — see ADR-0007.
 */
const questRewardShape = {
  coinReward: z.number().int().nonnegative().default(0),
  gemReward: z.number().int().nonnegative().default(0),
  researchReward: z.number().int().nonnegative().default(0),
};

export const QuestDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  requirement: ProgressionRequirementSchema,
  ...questRewardShape,
});

export type QuestDefinition = z.infer<typeof QuestDefinitionSchema>;
export type QuestType = QuestDefinition["requirement"]["type"];
