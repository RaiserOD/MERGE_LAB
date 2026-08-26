import { describe, expect, it } from "vitest";
import {
  UnlockConditionError,
  evaluateUnlockCondition,
  evaluateUnlockConditions,
  isSupportedUnlockCondition,
  referencedChapterId,
  type UnlockContext,
} from "@domain/progression/UnlockCondition";

function contextWith(overrides: Partial<UnlockContext> = {}): UnlockContext {
  return {
    labStage: 1,
    playerLevel: 1,
    isChapterUnlocked: () => false,
    ...overrides,
  };
}

describe("evaluateUnlockCondition", () => {
  it("compares lab stage at and above the threshold", () => {
    expect(evaluateUnlockCondition("labStage>=2", contextWith({ labStage: 1 }))).toBe(false);
    expect(evaluateUnlockCondition("labStage>=2", contextWith({ labStage: 2 }))).toBe(true);
    expect(evaluateUnlockCondition("labStage>=2", contextWith({ labStage: 5 }))).toBe(true);
  });

  it("compares player level independently of lab stage", () => {
    const context = contextWith({ labStage: 5, playerLevel: 2 });
    expect(evaluateUnlockCondition("playerLevel>=3", context)).toBe(false);
    expect(evaluateUnlockCondition("playerLevel>=2", context)).toBe(true);
  });

  it("delegates chapter references to the context", () => {
    const context = contextWith({ isChapterUnlocked: (id) => id === "chapter.basement" });
    expect(evaluateUnlockCondition("chapterUnlocked:chapter.basement", context)).toBe(true);
    expect(evaluateUnlockCondition("chapterUnlocked:chapter.chemistry", context)).toBe(false);
  });

  it("throws on an unsupported form rather than evaluating false", () => {
    expect(() => evaluateUnlockCondition("someUnknownCondition", contextWith())).toThrow(
      UnlockConditionError,
    );
    expect(() => evaluateUnlockCondition("labStage>2", contextWith())).toThrow(
      /Unsupported unlock condition/,
    );
  });
});

describe("evaluateUnlockConditions", () => {
  it("requires every condition", () => {
    const context = contextWith({ labStage: 3, playerLevel: 1 });
    expect(evaluateUnlockConditions(["labStage>=2", "playerLevel>=1"], context)).toBe(true);
    expect(evaluateUnlockConditions(["labStage>=2", "playerLevel>=4"], context)).toBe(false);
  });

  it("treats an empty list as satisfied — that is how a starter area is authored", () => {
    expect(evaluateUnlockConditions([], contextWith())).toBe(true);
  });
});

describe("condition introspection", () => {
  it("recognises exactly the supported forms", () => {
    expect(isSupportedUnlockCondition("labStage>=1")).toBe(true);
    expect(isSupportedUnlockCondition("playerLevel>=12")).toBe(true);
    expect(isSupportedUnlockCondition("chapterUnlocked:chapter.basement")).toBe(true);
    expect(isSupportedUnlockCondition("labStage >= 1")).toBe(false);
    expect(isSupportedUnlockCondition("chapterUnlocked:")).toBe(false);
  });

  it("extracts the chapter id only from chapter references", () => {
    expect(referencedChapterId("chapterUnlocked:chapter.basement")).toBe("chapter.basement");
    expect(referencedChapterId("labStage>=2")).toBeUndefined();
  });
});
