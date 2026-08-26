import { describe, expect, it } from "vitest";

import type { ChapterDefinition } from "@domain/progression/ChapterDefinition";

import { validateChapters } from "../../tools/content-validator/index";

/**
 * The validator is a CLI tool; only its chapter rules are exercised here,
 * because chapter numbering (ADR-0010) is an invariant content alone can
 * break and nothing else checks.
 */
function chapter(overrides: Partial<ChapterDefinition> = {}): ChapterDefinition {
  return {
    id: "chapter.one",
    chapterNumber: 1,
    title: "One",
    unlockConditions: [],
    availableItemGroups: [],
    availableGenerators: [],
    dialogueIds: [],
    labStage: 1,
    ...overrides,
  };
}

function validate(chapters: ChapterDefinition[]): string[] {
  return validateChapters(
    chapters,
    new Set(chapters.map((entry) => entry.id)),
    new Set<string>(),
    new Set<number>([1]),
    new Set<string>(),
  );
}

describe("content validator — chapter numbering", () => {
  it("accepts contiguous numbering from 1", () => {
    expect(
      validate([
        chapter({ id: "chapter.one", chapterNumber: 1 }),
        chapter({ id: "chapter.two", chapterNumber: 2 }),
      ]),
    ).toEqual([]);
  });

  it("rejects two chapters claiming the same number, naming both", () => {
    const errors = validate([
      chapter({ id: "chapter.one", chapterNumber: 1 }),
      chapter({ id: "chapter.two", chapterNumber: 1 }),
    ]);

    expect(errors).toEqual(["chapter.two: chapterNumber 1 is already used by chapter.one"]);
  });

  it("rejects a gap in the numbering", () => {
    const errors = validate([
      chapter({ id: "chapter.one", chapterNumber: 1 }),
      chapter({ id: "chapter.three", chapterNumber: 3 }),
    ]);

    expect(errors).toEqual([
      "Chapter numbering has a gap: 2 chapter(s) defined, but none has chapterNumber 2",
    ]);
  });

  it("rejects numbering that does not start at 1", () => {
    const errors = validate([chapter({ chapterNumber: 2 })]);

    expect(errors).toEqual([
      "Chapter numbering has a gap: 1 chapter(s) defined, but none has chapterNumber 1",
    ]);
  });
});
