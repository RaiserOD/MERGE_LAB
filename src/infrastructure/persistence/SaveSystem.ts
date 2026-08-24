import { GameState } from "@domain/GameState";
import { SaveDataV1Schema } from "@domain/save/SaveDataV1";
import type { Clock } from "@infrastructure/clock/Clock";

/** Subset of the DOM Storage interface actually used — lets tests pass an in-memory fake with no DOM. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = "mergeLab.save";
const BACKUP_KEY = "mergeLab.save.backup";

/**
 * localStorage has no real transactions, so "atomic write" here means:
 * keep the previous save as a backup before overwriting, so a write that's
 * interrupted (or a save that's schema-valid JSON but semantically broken)
 * can still be recovered from. This is the only place in the codebase
 * allowed to call storage.setItem/getItem directly (B4).
 */
export class SaveSystem {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly clock: Clock,
  ) {}

  save(state: GameState): void {
    const data = state.toSaveData(this.clock.now());
    const validated = SaveDataV1Schema.parse(data);
    const json = JSON.stringify(validated);

    const previous = this.storage.getItem(SAVE_KEY);
    if (previous) {
      this.storage.setItem(BACKUP_KEY, previous);
    }
    this.storage.setItem(SAVE_KEY, json);
  }

  /** Never throws: falls back to backup, then to a fresh game (deterministic recovery). */
  load(): GameState {
    const primary = this.tryLoadFrom(SAVE_KEY);
    if (primary) {
      return primary;
    }

    const backup = this.tryLoadFrom(BACKUP_KEY);
    if (backup) {
      return backup;
    }

    return GameState.createNew();
  }

  private tryLoadFrom(key: string): GameState | undefined {
    const raw = this.storage.getItem(key);
    if (!raw) {
      return undefined;
    }

    try {
      const parsed = SaveDataV1Schema.safeParse(migrateToLatest(JSON.parse(raw)));
      return parsed.success ? GameState.fromSaveData(parsed.data) : undefined;
    } catch {
      return undefined;
    }
  }
}

/**
 * No migrations exist yet — SaveDataV1 is the only version. When a V2 ships,
 * branch on `(raw as { version?: number }).version` here and transform
 * forward before schema validation.
 */
function migrateToLatest(raw: unknown): unknown {
  return raw;
}
