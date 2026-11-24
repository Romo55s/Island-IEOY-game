import { readFile, stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { CHARACTER_CATALOG } from "../../src/shared/domain";
import { CHARACTER_VOICES } from "../../src/audio/characterVoices";
import { dialogueFrame, timeDialogue } from "../../src/game/story/dialoguePlayback";

const line = (characterId: string, text: string) => ({ characterId, text, emotion: "neutral" as const, animation: "agree" as const });

describe("recorded character voices", () => {
  it("assigns the complete cast consistently within its voice pools", () => {
    expect(Object.keys(CHARACTER_VOICES).sort()).toEqual(CHARACTER_CATALOG.map(c => c.id).sort());
    const female = new Set(["cast-samantha", "cast-esther-morgan", "cast-michelle", "cast-jessica-adlock", "cast-maria"]);
    for (const [id, voice] of Object.entries(CHARACTER_VOICES)) {
      expect(voice.pool).toBe(female.has(id) ? "female" : "male");
      expect(voice.file).toBe(`/audio/voices/${voice.clipId}.mp3`);
    }
    const counts = Object.values(CHARACTER_VOICES).filter(v => v.pool === "male").reduce<Record<string,number>>((r,v) => ({...r,[v.clipId]:(r[v.clipId]??0)+1}),{});
    expect(Math.max(...Object.values(counts))-Math.min(...Object.values(counts))).toBeLessThanOrEqual(1);
  });
  it("ships every assigned sanitized file with measured headroom and no source paths", async () => {
    const raw = await readFile("public/audio/voices/manifest.json", "utf8");
    expect(raw).not.toContain("/Users/");
    const manifest = JSON.parse(raw);
    expect(manifest.clips).toHaveLength(11);
    for (const clip of manifest.clips) {
      expect(clip.sampleRate).toBe(24000);
      expect(clip.channels).toBe(1);
      expect(clip.truePeakDbtp).toBeLessThanOrEqual(-2.5);
      expect(clip.integratedLufs).toBeGreaterThan(-22);
      expect(clip.integratedLufs).toBeLessThan(-19);
      expect((await stat(`public${clip.file}`)).size).toBe(clip.bytes);
    }
    for (const voice of Object.values(CHARACTER_VOICES)) expect(manifest.clips.some((clip: {id:string})=>clip.id===voice.clipId)).toBe(true);
  });
});

describe("dialogue typing clock", () => {
  it("reveals in authored order, pauses between speakers and finishes exactly", () => {
    const timeline = timeDialogue([line("cast-tony","Hi!"), line("cast-jim-young","Yes.")]);
    expect(dialogueFrame(timeline,0)).toMatchObject({activeIndex:0,visibleText:["H",""]});
    expect(dialogueFrame(timeline,timeline[0]!.end+1)).toMatchObject({activeIndex:-1,visibleText:["Hi!",""]});
    expect(dialogueFrame(timeline,timeline[1]!.start)).toMatchObject({activeIndex:1,visibleText:["Hi!","Y"]});
    expect(dialogueFrame(timeline,timeline[1]!.end)).toMatchObject({activeIndex:-1,complete:true,visibleText:["Hi!","Yes."]});
  });
  it("skip shows all text and stops the speaker, including unicode text", () => {
    const timeline = timeDialogue([line("cast-courtney","I—I can 🎣.")]);
    expect(dialogueFrame(timeline,0,true)).toMatchObject({activeIndex:-1,complete:true,visibleText:["I—I can 🎣."]});
    expect(dialogueFrame([],0).complete).toBe(true);
  });
});
