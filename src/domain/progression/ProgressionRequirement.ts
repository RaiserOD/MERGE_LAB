import { z } from "zod";

/**
 * A condition on game state, satisfied by domain events rather than UI
 * state (canon §4). One shared predicate serves both quests and — once the
 * campaign layer lands — level completion requirements, which canon
 * specifies with the same vocabulary. See ADR-0007.
 *
 * Two shapes:
 *
 * - **Counting** predicates accumulate matching events until `target`.
 *   Those that can be scoped carry an optional filter (itemId /
 *   orderId / generatorId / questId); omitting it counts every qualifying
 *   action. That is why canon's COMPLETE_ORDERS and DISCOVERIES_COUNT get
 *   no type of their own here — they are the unfiltered forms of
 *   COMPLETE_ORDER and DISCOVER_ITEM.
 * - **Threshold** predicates read current state. UPGRADE_LAB is the only
 *   one: it is satisfied by *being* at a lab stage, not by having upgraded
 *   a number of times. Its field is `labStage` rather than `target` to
 *   make that visible at the call site.
 *
 * Canon's UNLOCK_RESEARCH is deliberately absent: no research system
 * exists to emit the event that would satisfy it, and a predicate nothing
 * can evaluate is worse than a missing one. It lands with research.
 */
const countingShape = {
  target: z.number().int().positive(),
};

export const ProgressionRequirementSchema = z.discriminatedUnion("type", [
  z.object({ ...countingShape, type: z.literal("MERGE_COUNT") }),
  z.object({
    ...countingShape,
    type: z.literal("DISCOVER_ITEM"),
    itemId: z.string().min(1).optional(),
  }),
  z.object({
    ...countingShape,
    type: z.literal("COMPLETE_ORDER"),
    orderId: z.string().min(1).optional(),
  }),
  z.object({ ...countingShape, type: z.literal("EARN_COINS") }),
  z.object({
    ...countingShape,
    type: z.literal("USE_GENERATOR"),
    generatorId: z.string().min(1).optional(),
  }),
  z.object({ ...countingShape, type: z.literal("SPEND_ENERGY") }),
  z.object({
    ...countingShape,
    type: z.literal("COMPLETE_QUEST"),
    questId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("UPGRADE_LAB"),
    labStage: z.number().int().positive(),
  }),
]);

export type ProgressionRequirement = z.infer<typeof ProgressionRequirementSchema>;
export type ProgressionRequirementType = ProgressionRequirement["type"];

/** An absent filter matches everything; a present one must match exactly. */
export function matchesFilter(filter: string | undefined, actual: string): boolean {
  return filter === undefined || filter === actual;
}
