import { z } from "zod";

export const ItemRaritySchema = z.enum(["common", "uncommon", "rare", "epic", "legendary"]);
export type ItemRarity = z.infer<typeof ItemRaritySchema>;

export const ItemDefinitionSchema = z.object({
  id: z.string().min(1),
  mergeGroup: z.string().min(1),
  level: z.number().int().positive(),
  displayName: z.string().min(1),
  rarity: ItemRaritySchema,
  sellValue: z.number().int().nonnegative(),
  xpValue: z.number().int().nonnegative(),
  spriteKey: z.string().min(1),
  resultItemId: z.string().min(1).optional(),
  sourceGeneratorIds: z.array(z.string().min(1)),
  tags: z.array(z.string().min(1)),
  maxLevel: z.boolean().optional(),
});

export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
