import type { GeneratorDefinition } from "@domain/generators/GeneratorDefinition";

export class GeneratorRegistry {
  private readonly byId: Map<string, GeneratorDefinition>;

  constructor(definitions: readonly GeneratorDefinition[]) {
    this.byId = new Map();

    for (const definition of definitions) {
      if (this.byId.has(definition.id)) {
        throw new Error(`Duplicate generator id in content: ${definition.id}`);
      }
      if (definition.chargesPerCycle > definition.maxCharges) {
        throw new Error(
          `${definition.id}: chargesPerCycle (${definition.chargesPerCycle}) exceeds maxCharges (${definition.maxCharges})`,
        );
      }
      this.byId.set(definition.id, definition);
    }
  }

  getById(id: string): GeneratorDefinition | undefined {
    return this.byId.get(id);
  }

  requireById(id: string): GeneratorDefinition {
    const generator = this.byId.get(id);
    if (!generator) {
      throw new Error(`Unknown generator id: ${id}`);
    }
    return generator;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): readonly GeneratorDefinition[] {
    return [...this.byId.values()];
  }
}
