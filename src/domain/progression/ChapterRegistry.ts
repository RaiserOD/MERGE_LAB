import type { ChapterDefinition } from "@domain/progression/ChapterDefinition";
import type { LabStageDefinition } from "@domain/progression/LabStageDefinition";

export class ChapterRegistry {
  private readonly byId: Map<string, ChapterDefinition>;

  constructor(definitions: readonly ChapterDefinition[]) {
    this.byId = new Map();

    for (const definition of definitions) {
      if (this.byId.has(definition.id)) {
        throw new Error(`Duplicate chapter id in content: ${definition.id}`);
      }
      this.byId.set(definition.id, definition);
    }
  }

  getById(id: string): ChapterDefinition | undefined {
    return this.byId.get(id);
  }

  requireById(id: string): ChapterDefinition {
    const chapter = this.byId.get(id);
    if (!chapter) {
      throw new Error(`Unknown chapter id: ${id}`);
    }
    return chapter;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): readonly ChapterDefinition[] {
    return [...this.byId.values()];
  }
}

export class LabStageRegistry {
  private readonly byStage: Map<number, LabStageDefinition>;

  constructor(definitions: readonly LabStageDefinition[]) {
    this.byStage = new Map();

    for (const definition of definitions) {
      if (this.byStage.has(definition.stage)) {
        throw new Error(`Duplicate lab stage in content: ${definition.stage}`);
      }
      this.byStage.set(definition.stage, definition);
    }
  }

  getByStage(stage: number): LabStageDefinition | undefined {
    return this.byStage.get(stage);
  }

  requireByStage(stage: number): LabStageDefinition {
    const definition = this.byStage.get(stage);
    if (!definition) {
      throw new Error(`Unknown lab stage: ${stage}`);
    }
    return definition;
  }

  maxStage(): number {
    return Math.max(...this.byStage.keys());
  }

  all(): readonly LabStageDefinition[] {
    return [...this.byStage.values()].sort((a, b) => a.stage - b.stage);
  }
}
