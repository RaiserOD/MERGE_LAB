import { z } from "zod";

export const ItemRaritySchema = z.enum(["common", "uncommon", "rare", "epic", "legendary"]);
export type ItemRarity = z.infer<typeof ItemRaritySchema>;

export const ItemDefinitionSchema = z.object({
  id: z.string().min(1),
  mergeGroup: z.string().min(1),
  level: z.number().int().positive(),
  displayName: z.string().min(1),
  rarity: ItemRaritySchema,
  /**
   * Coins the item is worth if sold. Optional: there is no selling mechanic
   * (`docs/design/game-design.md` lists it as a deliberate non-feature), so
   * nothing reads this. Required, it forced every new item to invent a
   * balance number for a mechanic that does not exist. The two items that
   * already carry one keep it — the values are plausible and cost nothing.
   */
  sellValue: z.number().int().nonnegative().optional(),
  xpValue: z.number().int().nonnegative(),
  spriteKey: z.string().min(1),
  resultItemId: z.string().min(1).optional(),
  sourceGeneratorIds: z.array(z.string().min(1)),
  tags: z.array(z.string().min(1)),
  maxLevel: z.boolean().optional(),
});

export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
