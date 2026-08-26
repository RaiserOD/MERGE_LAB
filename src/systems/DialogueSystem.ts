import type { DialogueLine } from "@domain/dialogues/DialogueDefinition";
import type { DialogueRegistry } from "@domain/dialogues/DialogueRegistry";
import type { ProgressionSave } from "@domain/save/SaveDataV1";
import type { DomainEvent } from "@systems/events/DomainEvent";
import type { EventBus } from "@systems/events/EventBus";

export class DialogueError extends Error {}

export interface ActiveDialogue {
  readonly dialogueId: string;
  readonly lineIndex: number;
  readonly line: DialogueLine;
  readonly isLastLine: boolean;
}

/**
 * Playback cursor over dialogue content. It owns which dialogue is
 * on screen and how far through it the player is, and records one-shot
 * dialogues as seen so chapter intros never replay.
 *
 * Presentation subscribes to the events rather than being called directly,
 * matching how the other systems talk to the UI.
 */
export class DialogueSystem {
  private activeDialogueId: string | undefined;
  private lineIndex = 0;

  constructor(
    private readonly progression: ProgressionSave,
    private readonly registry: DialogueRegistry,
    private readonly eventBus: EventBus<DomainEvent>,
  ) {}

  isActive(): boolean {
    return this.activeDialogueId !== undefined;
  }

  hasSeen(dialogueId: string): boolean {
    return this.progression.seenDialogueIds.includes(dialogueId);
  }

  /** A one-shot dialogue already seen can't play again; repeatable ones always can. */
  canPlay(dialogueId: string): boolean {
    const dialogue = this.registry.requireById(dialogueId);
    return !dialogue.oneShot || !this.hasSeen(dialogueId);
  }

  getActive(): ActiveDialogue | undefined {
    if (!this.activeDialogueId) {
      return undefined;
    }

    const dialogue = this.registry.requireById(this.activeDialogueId);
    const line = dialogue.lines[this.lineIndex];
    if (!line) {
      throw new DialogueError(
        `${this.activeDialogueId} has no line at index ${String(this.lineIndex)}`,
      );
    }

    return {
      dialogueId: this.activeDialogueId,
      lineIndex: this.lineIndex,
      line,
      isLastLine: this.lineIndex === dialogue.lines.length - 1,
    };
  }

  /**
   * Starts a dialogue. Returns false without changing anything when it has
   * already been seen or another dialogue is still on screen, so callers
   * can fire chapter intros unconditionally.
   */
  start(dialogueId: string): boolean {
    if (this.isActive() || !this.canPlay(dialogueId)) {
      return false;
    }

    const dialogue = this.registry.requireById(dialogueId);
    this.activeDialogueId = dialogueId;
    this.lineIndex = 0;

    this.eventBus.emit({
      type: "DIALOGUE_STARTED",
      dialogueId,
      lineCount: dialogue.lines.length,
    });
    return true;
  }

  /** Moves to the next line, completing the dialogue when the last one is passed. */
  advance(): void {
    const active = this.activeDialogueId;
    if (!active) {
      return;
    }

    const dialogue = this.registry.requireById(active);
    if (this.lineIndex < dialogue.lines.length - 1) {
      this.lineIndex += 1;
      this.eventBus.emit({
        type: "DIALOGUE_ADVANCED",
        dialogueId: active,
        lineIndex: this.lineIndex,
      });
      return;
    }

    this.finish(active);
  }

  /** Ends the dialogue immediately; it still counts as seen. */
  skip(): void {
    if (this.activeDialogueId) {
      this.finish(this.activeDialogueId);
    }
  }

  private finish(dialogueId: string): void {
    this.activeDialogueId = undefined;
    this.lineIndex = 0;

    if (!this.hasSeen(dialogueId)) {
      this.progression.seenDialogueIds.push(dialogueId);
    }

    this.eventBus.emit({ type: "DIALOGUE_COMPLETED", dialogueId });
  }
}
