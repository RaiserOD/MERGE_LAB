import { describe, expect, it } from "vitest";
import { GameContext, type SaveOutcome } from "@app/GameContext";
import type { KeyValueStorage } from "@infrastructure/persistence/SaveSystem";
import { InMemoryStorage } from "../fixtures/InMemoryStorage";
import { FixedClock } from "../fixtures/FixedClock";

/**
 * GameScene calls save() after every player action, straight from the
 * render path. A storage failure there must cost a warning, not the
 * session — see the doc comment on GameContext.save.
 */
class RefusingStorage implements KeyValueStorage {
  constructor(private readonly error: Error) {}
  getItem(): string | null {
    return null;
  }
  setItem(): void {
    throw this.error;
  }
  removeItem(): void {
    // nothing stored, nothing to remove
  }
}

/** Narrows to the failure case, so assertions read as plain field access. */
function expectFailure(outcome: SaveOutcome): Extract<SaveOutcome, { ok: false }> {
  if (outcome.ok) {
    throw new Error("expected the save to fail, but it reported success");
  }
  return outcome;
}

function quotaError(): Error {
  const error = new Error("persistent storage is full");
  error.name = "QuotaExceededError";
  return error;
}

describe("GameContext.save", () => {
  it("reports success on a working store", () => {
    const context = new GameContext({ storage: new InMemoryStorage(), clock: new FixedClock(0) });

    expect(context.save()).toEqual({ ok: true });
  });

  it("returns a failure instead of throwing when storage is full", () => {
    const context = new GameContext({
      storage: new RefusingStorage(quotaError()),
      clock: new FixedClock(0),
    });

    expect(expectFailure(context.save()).message).toMatch(/storage space/i);
  });

  it("recognises the legacy numeric quota codes browsers still use", () => {
    const legacy = Object.assign(new Error("quota"), { code: 22 });
    const context = new GameContext({
      storage: new RefusingStorage(legacy),
      clock: new FixedClock(0),
    });

    expect(expectFailure(context.save()).message).toMatch(/storage space/i);
  });

  it("falls back to a generic message for any other write failure", () => {
    const context = new GameContext({
      storage: new RefusingStorage(new Error("serialization blew up")),
      clock: new FixedClock(0),
    });

    expect(expectFailure(context.save()).message).toBe("Progress could not be saved");
  });

  it("keeps the underlying error for diagnosis rather than swallowing it", () => {
    const cause = new Error("serialization blew up");
    const context = new GameContext({
      storage: new RefusingStorage(cause),
      clock: new FixedClock(0),
    });

    expect(expectFailure(context.save()).error).toBe(cause);
  });
});
