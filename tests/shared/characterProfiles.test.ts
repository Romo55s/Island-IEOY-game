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

  it("keeps workplace roles and character voice settings explicit", () => {
    const profile = (id: string) => CHARACTER_PROFILES.find(({ characterId }) => characterId === id)!;
    expect(profile("cast-jessica-adlock").teamRoles).toContain("product-owner");
    expect(profile("cast-walter").teamRoles).toContain("product-owner");
    expect(profile("cast-jorge").teamRoles).toContain("scrum-master");
    expect(profile("cast-tim").teamRoles).toContain("manager");
    expect(profile("cast-maria").teamRoles).toContain("drupal-developer");
    expect(profile("cast-maria").teamRoles).toContain("director");
    expect(profile("cast-jim-young").voice.humorStyle).toBe("sarcastic");
    expect(profile("cast-samantha").voice.nervousness).toBe("high");
    expect(profile("cast-jacob-ramirez").voice.talkativeness).toBe("low");
    expect(profile("cast-zach").voice.talkativeness).toBe("low");
    expect(profile("cast-daniel").voice.expertise).toContain("troubleshooting");
    expect(profile("cast-esther-morgan").voice.expertise).toContain("observation");
    expect(profile("cast-zach").voice.expertise).toContain("food-awareness");
    expect(profile("cast-courtney").voice.expertise).toContain("fishing");
    expect(() => validateCharacterProfiles(CHARACTER_PROFILES.map((entry) => entry.characterId === "cast-tim" ? { ...entry, teamRoles: ["executive"] } as never : entry))).toThrow();
    expect(() => validateCharacterProfiles(CHARACTER_PROFILES.map((entry) => entry.characterId === "cast-maria" ? { ...entry, teamRoles: ["director", "director"] as never } : entry))).toThrow(/unique/);
  });
});
