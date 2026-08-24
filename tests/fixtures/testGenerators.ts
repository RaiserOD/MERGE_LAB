import type { GeneratorDefinition } from "@domain/generators/GeneratorDefinition";

export const waterTapGenerator: GeneratorDefinition = {
  id: "gen.water_tap",
  outputItemId: "item.water",
  cooldownSeconds: 5,
  energyCost: 2,
  chargesPerCycle: 3,
  maxCharges: 3,
};

export const testGenerators: GeneratorDefinition[] = [waterTapGenerator];
