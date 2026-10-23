import { describe, expect, it } from "vitest";
import type { CrashResolution } from "../../src/shared/domain";
import { getCrashReactionClip } from "../../src/scene/phases/crashReactions";

const report: CrashResolution = {
  attempts: [
    { rescuerCharacterId: "tony", targetCharacterId: "daniel", itemId: "lighter", outcome: "rescuer-lost", complicationText: "A mishap." },
    { rescuerCharacterId: "samantha", targetCharacterId: "daniel", itemId: "rope", outcome: "success" },
  ],
  savedCharacterIds: ["daniel"],
  eliminatedCharacterIds: ["tony"],
  summary: "Daniel was saved; Tony became a ghost.",
};

describe("crash reaction presentation", () => {
  it("uses outcome clips without changing simulation state", () => {
    expect(getCrashReactionClip("tony", report)).toBe("fall");
    expect(getCrashReactionClip("daniel", report)).toBe("hug");
    expect(getCrashReactionClip("samantha", report)).toBe("cheer");
    expect(getCrashReactionClip("unrelated", report)).toBeUndefined();
    expect(report.eliminatedCharacterIds).toEqual(["tony"]);
  });
});
