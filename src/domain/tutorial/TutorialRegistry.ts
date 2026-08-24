import type { TutorialStepDefinition } from "@domain/tutorial/TutorialStepDefinition";

/** Ordered tutorial steps. Order comes from content, not from ids. */
export class TutorialRegistry {
  private readonly steps: readonly TutorialStepDefinition[];

  constructor(steps: readonly TutorialStepDefinition[]) {
    const seen = new Set<string>();
    for (const step of steps) {
      if (seen.has(step.id)) {
        throw new Error(`Duplicate tutorial step id in content: ${step.id}`);
      }
      seen.add(step.id);
    }
    this.steps = [...steps];
  }

  all(): readonly TutorialStepDefinition[] {
    return this.steps;
  }

  getById(id: string): TutorialStepDefinition | undefined {
    return this.steps.find((step) => step.id === id);
  }

  isEmpty(): boolean {
    return this.steps.length === 0;
  }
}
