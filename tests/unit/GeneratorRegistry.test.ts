import { describe, expect, it } from "vitest";
import { GeneratorRegistry } from "@domain/generators/GeneratorRegistry";
import { testGenerators, waterTapGenerator } from "../fixtures/testGenerators";

describe("GeneratorRegistry", () => {
  it("looks up generators by id", () => {
    const registry = new GeneratorRegistry(testGenerators);

    expect(registry.getById("gen.water_tap")).toEqual(waterTapGenerator);
    expect(registry.has("gen.unknown")).toBe(false);
  });

  it("throws on duplicate ids", () => {
    expect(() => new GeneratorRegistry([waterTapGenerator, waterTapGenerator])).toThrow(
      /Duplicate generator id/,
    );
  });

  it("rejects chargesPerCycle above maxCharges", () => {
    const broken = { ...waterTapGenerator, chargesPerCycle: 5, maxCharges: 3 };
    expect(() => new GeneratorRegistry([broken])).toThrow(/exceeds maxCharges/);
  });

  it("requireById throws for unknown ids", () => {
    const registry = new GeneratorRegistry(testGenerators);
    expect(() => registry.requireById("gen.unknown")).toThrow(/Unknown generator id/);
  });
});
