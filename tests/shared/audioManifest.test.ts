import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const MANIFEST_PATH = path.resolve("public/audio/manifest.json");
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const REQUIRED_CUE_IDS = [
  "ambient-island",
  "crash-impact",
  "vote-submit",
  "consequence-reveal",
  "character-fire",
  "ghost-arrival",
] as const;

const licenseSchema = z
  .object({
    id: z.string().min(1),
    author: z.string().min(1),
    sourceUrl: z.url().nullable(),
    attribution: z.string().min(1),
  })
  .strict();

const cueSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    url: z
      .string()
      .regex(/^\/audio\/[a-z0-9/_-]+\.(ogg|mp3|wav)$/)
      .refine((url) => !url.includes("..") && !url.includes("\\"), "unsafe audio URL"),
    category: z.enum(["music", "effects"]),
    license: licenseSchema,
    loop: z.boolean(),
    defaultGain: z.number().min(0).max(1),
    maxFileBytes: z.number().int().positive().max(MAX_AUDIO_BYTES),
    available: z.boolean(),
  })
  .strict()
  .superRefine((cue, context) => {
    if (cue.available && cue.license.sourceUrl === null) {
      context.addIssue({ code: "custom", message: "enabled cues require a source URL" });
    }
    if (cue.available && cue.license.id === "LicenseRef-UndistributedPlaceholder") {
      context.addIssue({ code: "custom", message: "enabled cues require a redistribution license" });
    }
  });

const audioManifestSchema = z
  .object({
    version: z.literal(1),
    fallback: z.literal("silent"),
    cues: z.array(cueSchema).max(64),
  })
  .strict()
  .superRefine((manifest, context) => {
    const ids = manifest.cues.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "duplicate cue ID" });
    }
  });

type AudioManifest = z.infer<typeof audioManifestSchema>;

function clone(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}

async function readManifest(): Promise<unknown> {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
}

describe("audio manifest", () => {
  it("provides stable cue contracts and a non-fatal silent fallback", async () => {
    const manifest = audioManifestSchema.parse(await readManifest());
    expect(manifest.fallback).toBe("silent");
    expect(manifest.cues.map(({ id }) => id)).toEqual(REQUIRED_CUE_IDS);

    for (const cue of manifest.cues) {
      const filePath = path.resolve("public", cue.url.slice(1));
      if (cue.available) {
        expect((await stat(filePath)).size).toBeLessThanOrEqual(cue.maxFileBytes);
      } else {
        await expect(access(filePath)).rejects.toThrow();
      }
    }
  });

  it("rejects duplicate IDs, remote URLs, missing licenses, unsupported formats, and unbounded values", async () => {
    const raw = await readManifest();
    const cases: Array<(manifest: any) => void> = [
      (manifest) => manifest.cues.push(clone(manifest.cues[0])),
      (manifest) => (manifest.cues[0].url = "https://example.com/ambient.ogg"),
      (manifest) => delete manifest.cues[0].license,
      (manifest) => (manifest.cues[0].url = "/audio/cues/ambient.flac"),
      (manifest) => (manifest.cues[0].loop = "yes"),
      (manifest) => (manifest.cues[0].category = "voice"),
      (manifest) => (manifest.cues[0].defaultGain = 1.01),
      (manifest) => (manifest.cues[0].maxFileBytes = MAX_AUDIO_BYTES + 1),
    ];

    for (const mutate of cases) {
      const candidate = clone(raw) as AudioManifest;
      mutate(candidate);
      expect(() => audioManifestSchema.parse(candidate)).toThrow();
    }
  });

  it("does not allow a placeholder license to be enabled", async () => {
    const candidate = clone(await readManifest()) as AudioManifest;
    candidate.cues[0]!.available = true;
    expect(() => audioManifestSchema.parse(candidate)).toThrow();
  });
});
