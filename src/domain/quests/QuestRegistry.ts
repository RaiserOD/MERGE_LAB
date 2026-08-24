import type { QuestDefinition } from "@domain/quests/QuestDefinition";

export class QuestRegistry {
  private readonly byId: Map<string, QuestDefinition>;

  constructor(definitions: readonly QuestDefinition[]) {
    this.byId = new Map();

    for (const definition of definitions) {
      if (this.byId.has(definition.id)) {
        throw new Error(`Duplicate quest id in content: ${definition.id}`);
      }
      this.byId.set(definition.id, definition);
    }
  }

  getById(id: string): QuestDefinition | undefined {
    return this.byId.get(id);
  }

  requireById(id: string): QuestDefinition {
    const quest = this.byId.get(id);
    if (!quest) {
      throw new Error(`Unknown quest id: ${id}`);
    }
    return quest;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): readonly QuestDefinition[] {
    return [...this.byId.values()];
  }
}
