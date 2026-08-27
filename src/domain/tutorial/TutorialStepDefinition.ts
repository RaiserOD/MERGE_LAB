import { z } from "zod";

/**
 * Tutorial steps (ML-027) walking the player through canon §7's "first 60
 * seconds": merge, discover, fulfil an order, restore the lab.
 *
 * A step completes when the domain event it watches fires — the tutorial
 * observes the same events quests do rather than gating input, so a player
 * who works it out early is never blocked waiting for the banner to catch
 * up.
 */
const completionShape = {
  ITEM_MERGED: z.object({
    event: z.literal("ITEM_MERGED"),
    resultItemId: z.string().min(1).optional(),
  }),
  ITEM_DISCOVERED: z.object({
    event: z.literal("ITEM_DISCOVERED"),
    itemId: z.string().min(1).optional(),
  }),
  GENERATOR_USED: z.object({
    event: z.literal("GENERATOR_USED"),
    generatorId: z.string().min(1).optional(),
  }),
  ORDER_COMPLETED: z.object({
    event: z.literal("ORDER_COMPLETED"),
    orderId: z.string().min(1).optional(),
  }),
  LAB_UPGRADED: z.object({ event: z.literal("LAB_UPGRADED") }),
};

export const TutorialCompletionSchema = z.discriminatedUnion("event", [
  completionShape.ITEM_MERGED,
  completionShape.ITEM_DISCOVERED,
  completionShape.GENERATOR_USED,
  completionShape.ORDER_COMPLETED,
  completionShape.LAB_UPGRADED,
]);

export const TutorialStepDefinitionSchema = z.object({
  id: z.string().min(1),
  /** Short imperative line shown in the banner while this step is current. */
  instruction: z.string().min(1),
  /** Optional Professor line played when the step becomes current. */
  dialogueId: z.string().min(1).optional(),
  completedBy: TutorialCompletionSchema,
});

export type TutorialCompletion = z.infer<typeof TutorialCompletionSchema>;
export type TutorialStepDefinition = z.infer<typeof TutorialStepDefinitionSchema>;
export type TutorialTriggerEvent = TutorialCompletion["event"];
