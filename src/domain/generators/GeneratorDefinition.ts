import { z } from "zod";

export const GeneratorDefinitionSchema = z.object({
  id: z.string().min(1),
  outputItemId: z.string().min(1),
  cooldownSeconds: z.number().nonnegative(),
  energyCost: z.number().int().nonnegative(),
  chargesPerCycle: z.number().int().positive(),
  maxCharges: z.number().int().positive(),
});

export type GeneratorDefinition = z.infer<typeof GeneratorDefinitionSchema>;
