import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { getBounds, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

const MANIFEST_PATH = path.resolve("public/models/characters/manifest.json");
const SOURCE_PATH = path.resolve("3d_assets/Daniel_model.glb");
const EXPECTED_SOURCE_SHA256 = "d9c080d02cc6bbdd617fc65d13fa0f4bcf4d5f19021aa201540d93e48d7f2c75";
const SEMANTIC_ACTIONS = [
  "Idle",
  "ReactPositive",
  "ReactFunny",
  "Panic",
  "Hurt",
  "Death",
  "OnFire",
  "GhostIdle",
] as const;

const animationMapSchema = z
  .object({
    Idle: z.string().min(1),
    ReactPositive: z.string().min(1),
    ReactFunny: z.string().min(1),
    Panic: z.string().min(1),
    Hurt: z.string().min(1),
    Death: z.string().min(1),
    OnFire: z.string().min(1),
    GhostIdle: z.string().min(1),
  })
  .strict();

const characterSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    displayName: z.string().min(1).max(40),
    url: z
      .string()
      .regex(/^\/models\/characters\/[a-z0-9-]+\.glb$/)
      .refine((url) => !url.includes("..") && !url.includes("\\"), "unsafe character URL"),
    heightMeters: z.number().positive().max(3),
    animationMap: animationMapSchema,
    retainedClips: z.array(z.string().min(1)).min(1).max(24),
    renderProfile: z
      .object({
        id: z.literal("ps1-character"),
        meshopt: z.literal(true),
        tintable: z.literal(true),
        textureMaxPx: z.number().int().min(64).max(256),
      })
      .strict(),
    license: z
      .object({
        id: z.string().min(1),
        author: z.string().min(1),
        sourceUrl: z.url().nullable(),
        attribution: z.string().min(1),
      })
      .strict(),
    repositoryApproved: z.literal(true),
    deploymentApproved: z.boolean(),
  })
  .strict()
  .superRefine((character, context) => {
    if (new Set(character.retainedClips).size !== character.retainedClips.length) {
      context.addIssue({ code: "custom", message: "duplicate retained clip" });
    }
    for (const action of SEMANTIC_ACTIONS) {
      if (!character.retainedClips.includes(character.animationMap[action])) {
        context.addIssue({ code: "custom", message: `mapped clip is not retained: ${action}` });
      }
    }
  });

const manifestSchema = z
  .object({
    version: z.literal(1),
    textureBudget: z
      .object({
        minDimensionPx: z.number().int().min(1).max(256),
        maxDimensionPx: z.number().int().min(64).max(256),
        maxModelBytes: z.number().int().positive().max(2 * 1024 * 1024),
      })
      .strict()
      .refine((budget) => budget.minDimensionPx <= budget.maxDimensionPx),
    characters: z.array(characterSchema).min(1).max(8),
  })
  .strict()
  .superRefine((manifest, context) => {
    const ids = manifest.characters.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "duplicate character ID" });
    }
  });

type CharacterManifest = z.infer<typeof manifestSchema>;

function clone(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

async function readManifest(): Promise<unknown> {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
}

describe("character manifest", () => {
  let rawManifest: unknown;
  let manifest: CharacterManifest;

  beforeAll(async () => {
    rawManifest = await readManifest();
    manifest = manifestSchema.parse(rawManifest);
  });

  it("rejects duplicate IDs, unsafe or missing GLB URLs, oversized textures, unknown actions, and unapproved entries", () => {
    const duplicate = clone(rawManifest) as CharacterManifest;
    duplicate.characters.push(clone(duplicate.characters[0]) as CharacterManifest["characters"][number]);
    expect(() => manifestSchema.parse(duplicate)).toThrow();

    for (const invalidUrl of ["", "https://example.com/daniel.glb", "/models/characters/../source.glb"]) {
      const candidate = clone(rawManifest) as CharacterManifest;
      candidate.characters[0]!.url = invalidUrl;
      expect(() => manifestSchema.parse(candidate)).toThrow();
    }

    const oversizedTexture = clone(rawManifest) as CharacterManifest;
    oversizedTexture.characters[0]!.renderProfile.textureMaxPx = 512;
    expect(() => manifestSchema.parse(oversizedTexture)).toThrow();

    const unknownAction = clone(rawManifest) as Record<string, any>;
    unknownAction.characters[0].animationMap.Dance = "dance_02";
    expect(() => manifestSchema.parse(unknownAction)).toThrow();

    const unapproved = clone(rawManifest) as CharacterManifest;
    (unapproved.characters[0] as { repositoryApproved: boolean }).repositoryApproved = false;
    expect(() => manifestSchema.parse(unapproved)).toThrow();
  });

  it("maps every semantic action to a clip that exists in the optimized GLB", async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ "meshopt.decoder": MeshoptDecoder });

    for (const character of manifest.characters) {
      const filePath = path.resolve("public", character.url.slice(1));
      const document = await io.read(filePath);
      const root = document.getRoot();
      const clips = new Set(root.listAnimations().map((animation) => animation.getName()));

      expect(new Set(character.retainedClips)).toEqual(clips);
      for (const action of SEMANTIC_ACTIONS) {
        expect(clips.has(character.animationMap[action]), `${action} clip`).toBe(true);
      }

      expect((await stat(filePath)).size).toBeLessThanOrEqual(manifest.textureBudget.maxModelBytes);
      for (const texture of root.listTextures()) {
        const size = texture.getSize();
        expect(size).not.toBeNull();
        expect(size![0]).toBeLessThanOrEqual(manifest.textureBudget.maxDimensionPx);
        expect(size![1]).toBeLessThanOrEqual(manifest.textureBudget.maxDimensionPx);
        expect(size![0]).toBeGreaterThanOrEqual(manifest.textureBudget.minDimensionPx);
        expect(size![1]).toBeGreaterThanOrEqual(manifest.textureBudget.minDimensionPx);
      }
      for (const material of root.listMaterials()) {
        expect(material.getNormalTexture(), "normal map causes tangent-space warning").toBeNull();
        expect(material.getMetallicRoughnessTexture()).toBeNull();
      }

      const scene = root.listScenes()[0];
      expect(scene).toBeDefined();
      const bounds = getBounds(scene!);
      expect(Math.abs(bounds.min[1])).toBeLessThanOrEqual(0.02);
      const skinnedMeshNodes = root.listNodes().filter((node) => node.getMesh() && node.getSkin());
      expect(skinnedMeshNodes.length).toBeGreaterThan(0);
      expect(skinnedMeshNodes.every((node) => node.getParentNode() !== null)).toBe(true);
      expect(root.listExtensionsUsed().map((extension) => extension.extensionName)).toContain(
        "EXT_meshopt_compression",
      );
    }
  });

  it("preserves the approved source byte-for-byte", async () => {
    const source = await readFile(SOURCE_PATH);
    expect(createHash("sha256").update(source).digest("hex")).toBe(EXPECTED_SOURCE_SHA256);
  });

  it("rejects a semantic mapping to a source clip that is not retained", () => {
    const candidate = clone(rawManifest) as CharacterManifest;
    candidate.characters[0]!.animationMap.Panic = "clip-that-does-not-exist";
    expect(() => manifestSchema.parse(candidate)).toThrow();
  });
});
