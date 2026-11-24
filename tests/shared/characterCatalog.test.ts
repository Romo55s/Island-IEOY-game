import { describe, expect, it } from "vitest";
import { CHARACTER_CATALOG } from "../../src/shared/domain";
import { PublicGameSnapshotSchema } from "../../src/shared/protocol";

describe("coworker character catalog", () => {
  it("contains the game cast with unique selectable IDs and models aligned to each name", () => {
    expect(CHARACTER_CATALOG.map(({ displayName }) => displayName)).toEqual([
      "Daniel", "Samantha", "Jim Young", "Esther Morgan", "Tim", "Tony", "Michelle", "Jacob Ramirez", "Zach",
      "Jessica Adlock", "Jorge", "Maria", "Richard Wang", "Steve", "Walter", "Courtney",
    ]);
    expect(new Set(CHARACTER_CATALOG.map(({ id }) => id)).size).toBe(16);
    expect(PublicGameSnapshotSchema.shape.characterCatalog.parse(CHARACTER_CATALOG)).toHaveLength(16);
    expect(Object.fromEntries(CHARACTER_CATALOG.map(({ displayName, modelUrl }) => [displayName, modelUrl]))).toMatchObject({
      Daniel: "/models/characters/daniel.glb",
      Samantha: "/models/characters/samantha-raut.glb",
      "Jim Young": "/models/characters/jim-young.glb",
      "Esther Morgan": "/models/characters/esther-morgan.glb",
      Tim: "/models/characters/tim-corrigan.glb",
      Michelle: "/models/characters/michelle.glb",
      "Jacob Ramirez": "/models/characters/jacob-ramirez.glb",
      Zach: "/models/characters/zach.glb",
      "Jessica Adlock": "/models/characters/jessica-adlock.glb",
      Jorge: "/models/characters/jorge.glb",
      Maria: "/models/characters/maria.glb",
      "Richard Wang": "/models/characters/richard-wang.glb",
      Steve: "/models/characters/steve.glb",
      Walter: "/models/characters/walter.glb",
      Courtney: "/models/characters/courtney.glb",
    });
  });
});
