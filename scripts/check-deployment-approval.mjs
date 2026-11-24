import { readFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const characters = await readJson("public/models/characters/manifest.json");
const voices = await readJson("public/audio/voices/manifest.json");

const unapprovedCharacters = (characters.characters ?? [])
  .filter((character) => character.deploymentApproved !== true)
  .map((character) => character.displayName ?? character.id);
const voicesApproved = voices.deploymentApproved === true;

if (unapprovedCharacters.length || !voicesApproved) {
  console.error("Cloudflare deployment stopped: explicit deployment approval is missing.");
  if (unapprovedCharacters.length) {
    console.error(`Character models awaiting approval (${unapprovedCharacters.length}): ${unapprovedCharacters.join(", ")}`);
  }
  if (!voicesApproved) console.error("Team voice recordings: set deploymentApproved to true in public/audio/voices/manifest.json only after approval.");
  process.exit(1);
}

console.log(`Deployment approval verified for ${characters.characters.length} character models and team voice recordings.`);
