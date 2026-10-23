import { describe, expect, it } from "vitest";
import { CHARACTER_CATALOG } from "../../src/shared/domain";
import { CHARACTER_PROFILES, validateCharacterProfiles } from "../../src/shared/content/characterProfiles";

describe("character profiles", () => {
  it("covers every playable character with presentation personality and reaction content", () => {
    expect(() => validateCharacterProfiles(CHARACTER_PROFILES)).not.toThrow();
    expect(CHARACTER_PROFILES.map(({ characterId }) => characterId).sort()).toEqual(CHARACTER_CATALOG.map(({ id }) => id).sort());
    expect(CHARACTER_PROFILES.every(({ reactions }) => reactions.calm.length > 0 && reactions.danger.length > 0 && reactions.success.length > 0)).toBe(true);
    expect(CHARACTER_PROFILES.every(({ reactions }) => reactions.calm.length >= 2 && reactions.danger.length >= 2 && reactions.success.length >= 2)).toBe(true);
    expect(CHARACTER_PROFILES.every(({ reactions }) => reactions.hunger.length >= 1)).toBe(true);
  });

  it("rejects unknown, missing, and duplicate character profiles", () => {
    expect(() => validateCharacterProfiles([...CHARACTER_PROFILES.slice(0, -1), { ...CHARACTER_PROFILES.at(-1)!, characterId: "unknown" }])).toThrow(/Unknown/);
    expect(() => validateCharacterProfiles(CHARACTER_PROFILES.slice(0, -1))).toThrow(/Missing/);
    expect(() => validateCharacterProfiles([...CHARACTER_PROFILES, CHARACTER_PROFILES[0]!])).toThrow(/Duplicate/);
  });
});
