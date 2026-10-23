import { describe, expect, it } from "vitest";
import { CHARACTER_CATALOG } from "../../src/shared/domain";
import { PublicGameSnapshotSchema } from "../../src/shared/protocol";

describe("coworker character catalog", () => {
  it("contains the nine requested names with unique selectable IDs", () => {
    expect(CHARACTER_CATALOG.map(({ displayName }) => displayName)).toEqual([
      "Daniel", "Samantha", "Jim Young", "Esther Morgan", "Tim", "Tony", "Michelle", "Jacob Ramirez", "Zach",
    ]);
    expect(new Set(CHARACTER_CATALOG.map(({ id }) => id)).size).toBe(9);
    expect(PublicGameSnapshotSchema.shape.characterCatalog.parse(CHARACTER_CATALOG)).toHaveLength(9);
  });
});
