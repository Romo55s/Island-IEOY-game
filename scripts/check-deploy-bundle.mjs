import { readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";

const forbidden = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)\.dev\.vars(?:\.|$)/i,
  /(^|\/)asset-intake(?:\/|$)/i,
  /\.(?:fbx|blend|psd|tif|tiff|heic)$/i,
];

const buildDirectory = resolve(process.argv[2] ?? "dist");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    if (entry.isFile()) files.push(path);
  }

  return files;
}

const buildStats = await stat(buildDirectory).catch(() => null);
if (!buildStats?.isDirectory()) {
  throw new Error(`Build directory does not exist: ${buildDirectory}`);
}

const unsafeFiles = (await listFiles(buildDirectory))
  .map((path) => relative(buildDirectory, path))
  .filter((path) => forbidden.some((pattern) => pattern.test(path)));

if (unsafeFiles.length > 0) {
  throw new Error(`Forbidden deploy artifacts:\n${unsafeFiles.join("\n")}`);
}

console.log(`Bundle check passed for ${buildDirectory}`);
