import type { DialogueDefinition } from "@domain/dialogues/DialogueDefinition";

export class DialogueRegistry {
  private readonly byId: Map<string, DialogueDefinition>;

  constructor(definitions: readonly DialogueDefinition[]) {
    this.byId = new Map();

    for (const definition of definitions) {
      if (this.byId.has(definition.id)) {
        throw new Error(`Duplicate dialogue id in content: ${definition.id}`);
      }
      this.byId.set(definition.id, definition);
    }
  }

  getById(id: string): DialogueDefinition | undefined {
    return this.byId.get(id);
  }

  requireById(id: string): DialogueDefinition {
    const dialogue = this.byId.get(id);
    if (!dialogue) {
      throw new Error(`Unknown dialogue id: ${id}`);
    }
    return dialogue;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): readonly DialogueDefinition[] {
    return [...this.byId.values()];
  }
}
