import { z } from "zod";

export const LabStageDefinitionSchema = z.object({
  stage: z.number().int().positive(),
  title: z.string().min(1),
  /** Coins needed to upgrade INTO this stage. The starting stage costs 0. */
  upgradeCost: z.number().int().nonnegative(),
});

export type LabStageDefinition = z.infer<typeof LabStageDefinitionSchema>;
