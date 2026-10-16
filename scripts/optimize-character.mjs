#!/usr/bin/env node

import { mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { getBounds, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import {
  dedup,
  getGLPrimitiveCount,
  prune,
  reorder,
  resample,
  textureCompress,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const INPUT_ROOTS = [
  path.join(PROJECT_ROOT, "3d_assets"),
  path.join(PROJECT_ROOT, "asset-intake", "characters"),
];
const OUTPUT_ROOT = path.join(PROJECT_ROOT, "public", "models", "characters");
const PROFILE = "ps1-character";
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const TEXTURE_LIMIT = 256;

function fail(message) {
  throw new Error(message);
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function parseArgs(argv) {
  const [inputArg, outputArg, ...options] = argv;
  if (!inputArg || !outputArg) {
    fail(
      "Usage: node scripts/optimize-character.mjs <input.glb|input.gltf> <output.glb> --profile ps1-character --clips clip-a,clip-b",
    );
  }

  let profile = PROFILE;
  let clips = [];
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--profile") {
      profile = options[index + 1];
      index += 1;
    } else if (option === "--clips") {
      clips = (options[index + 1] ?? "")
        .split(",")
        .map((clip) => clip.trim())
        .filter(Boolean);
      index += 1;
    } else {
      fail(`Unknown option: ${option}`);
    }
  }

  if (profile !== PROFILE) fail(`Unsupported profile: ${profile}`);
  if (clips.length === 0) fail("--clips must contain at least one clip name");
  if (new Set(clips).size !== clips.length) fail("--clips contains duplicate names");

  return { inputArg, outputArg, profile, clips };
}

async function resolvePaths(inputArg, outputArg) {
  const input = await realpath(path.resolve(PROJECT_ROOT, inputArg));
  const output = path.resolve(PROJECT_ROOT, outputArg);
  const extension = path.extname(input).toLowerCase();

  if (!INPUT_ROOTS.some((root) => isInside(input, root))) {
    fail("Input must be under 3d_assets/ or asset-intake/characters/");
  }
  if (extension === ".fbx") {
    fail("FBX requires a user-provided conversion tool or a GLB re-export; Blender is not installed by this project");
  }
  if (extension !== ".glb" && extension !== ".gltf") {
    fail("Input must be a .glb or .gltf asset");
  }
  if (path.extname(output).toLowerCase() !== ".glb") fail("Output must use the .glb extension");
  if (!isInside(output, OUTPUT_ROOT)) fail("Output must be under public/models/characters/");
  if (input === output) fail("Output must not overwrite the source asset");

  await mkdir(path.dirname(output), { recursive: true });
  return { input, output };
}

function collectStats(document) {
  const root = document.getRoot();
  const primitives = root.listMeshes().flatMap((mesh) => mesh.listPrimitives());
  return {
    meshes: root.listMeshes().length,
    materials: root.listMaterials().length,
    textures: root.listTextures().length,
    nodes: root.listNodes().length,
    skins: root.listSkins().length,
    animations: root.listAnimations().length,
    triangles: primitives.reduce((sum, primitive) => sum + getGLPrimitiveCount(primitive), 0),
    clips: root.listAnimations().map((animation) => animation.getName()),
    textureSizes: root.listTextures().map((texture) => ({
      name: texture.getName(),
      size: texture.getSize(),
      mimeType: texture.getMimeType(),
    })),
  };
}

function validateDocument(document, expectedClips, label) {
  const root = document.getRoot();
  if (root.listScenes().length === 0) fail(`${label}: no scene found`);
  if (root.listMeshes().length === 0) fail(`${label}: no mesh found`);
  if (root.listSkins().length === 0) fail(`${label}: no skin found`);

  const clipNames = new Set(root.listAnimations().map((animation) => animation.getName()));
  for (const clip of expectedClips) {
    if (!clipNames.has(clip)) fail(`${label}: required clip is missing: ${clip}`);
  }

  const scenes = root.listScenes();
  const bounds = scenes.map((scene) => getBounds(scene));
  const minimumY = Math.min(...bounds.map(({ min }) => min[1]));
  const maximumY = Math.max(...bounds.map(({ max }) => max[1]));
  if (Math.abs(minimumY) > 0.02) fail(`${label}: feet origin is not at Y=0 (minimum Y ${minimumY})`);
  if (maximumY <= 0.1) fail(`${label}: model height is not plausible (${maximumY})`);

  const skinnedMeshNodes = root
    .listNodes()
    .filter((node) => node.getMesh() && node.getSkin());
  if (skinnedMeshNodes.length === 0) fail(`${label}: no skinned mesh node found`);
  if (skinnedMeshNodes.some((node) => !node.getParentNode())) {
    fail(`${label}: expected the inspected non-root skinned mesh hierarchy to be preserved`);
  }

  return { bounds, minimumY, maximumY };
}

function printStats(label, fileBytes, stats) {
  console.log(`${label}: ${fileBytes.toLocaleString()} bytes`);
  console.log(
    `  meshes=${stats.meshes} materials=${stats.materials} textures=${stats.textures} nodes=${stats.nodes} skins=${stats.skins} animations=${stats.animations} triangles=${stats.triangles}`,
  );
  console.log(`  clips=${stats.clips.join(",")}`);
  for (const texture of stats.textureSizes) {
    console.log(
      `  texture=${texture.name || "(unnamed)"} size=${texture.size?.join("x") ?? "unknown"} mime=${texture.mimeType ?? "unknown"}`,
    );
  }
}

async function main() {
  const { inputArg, outputArg, clips } = parseArgs(process.argv.slice(2));
  const { input, output } = await resolvePaths(inputArg, outputArg);
  const sourceBytes = (await stat(input)).size;

  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "meshopt.decoder": MeshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
    });

  const document = await io.read(input);
  const sourceNodeNames = new Set(document.getRoot().listNodes().map((node) => node.getName()));
  validateDocument(document, clips, "source");
  printStats("source", sourceBytes, collectStats(document));

  for (const animation of document.getRoot().listAnimations()) {
    if (!clips.includes(animation.getName())) animation.dispose();
  }

  for (const material of document.getRoot().listMaterials()) {
    material.setNormalTexture(null);
    material.setMetallicRoughnessTexture(null);
    material.setMetallicFactor(0);
    material.setRoughnessFactor(1);
  }

  await document.transform(
    dedup(),
    prune(),
    resample(),
    textureCompress({
      resize: [TEXTURE_LIMIT, TEXTURE_LIMIT],
      slots: /^baseColorTexture$/,
    }),
    reorder({ encoder: MeshoptEncoder, target: "size" }),
  );

  // The high-level meshopt() transform also quantizes POSITION data. That is a
  // poor fit for this inspected skinned asset because its bind-pose bounds and
  // feet origin must remain byte-for-byte equivalent after decoding. FILTER
  // keeps POSITION values intact while still using Meshopt compression.
  document
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

  const optimizedNodeNames = new Set(document.getRoot().listNodes().map((node) => node.getName()));
  const missingStableNames = [...sourceNodeNames].filter((name) => !optimizedNodeNames.has(name));
  if (missingStableNames.length > 0) fail(`optimization changed stable node names: ${missingStableNames.join(", ")}`);

  await io.write(output, document);

  const outputDocument = await io.read(output);
  const { bounds } = validateDocument(outputDocument, clips, "output");
  const outputStats = collectStats(outputDocument);
  for (const material of outputDocument.getRoot().listMaterials()) {
    if (material.getNormalTexture() || material.getMetallicRoughnessTexture()) {
      fail("output: PS1 profile retained a normal or metallic/roughness texture");
    }
  }
  for (const texture of outputDocument.getRoot().listTextures()) {
    const size = texture.getSize();
    if (!size || size[0] > TEXTURE_LIMIT || size[1] > TEXTURE_LIMIT) {
      fail(`output: texture exceeds ${TEXTURE_LIMIT}px budget: ${texture.getName()}`);
    }
  }

  const outputBytes = (await stat(output)).size;
  if (outputBytes > MAX_OUTPUT_BYTES) {
    fail(`output exceeds ${MAX_OUTPUT_BYTES.toLocaleString()} byte budget: ${outputBytes.toLocaleString()} bytes`);
  }

  printStats("output", outputBytes, outputStats);
  console.log(
    `  bounds=${bounds.map(({ min, max }) => `[${min.join(",")}]..[${max.join(",")}]`).join("; ")}`,
  );
  console.log("  axes=Y-up,+Z-forward (declared contract; optimizer does not rotate the source)");
  console.log("  hierarchy=non-root skinned mesh preserved");
  console.log(`saved=${output}`);
}

main().catch((error) => {
  console.error(`Character optimization failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
