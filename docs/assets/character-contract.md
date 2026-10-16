# Character Asset Intake Contract

This contract separates editable or unapproved source files from the GLB files that the browser may load. The runtime contract is GLB 2.0; FBX, Blender files, photographs, and other source formats are never runtime dependencies.

## Coordinate and scale contract

- Up axis: **+Y**.
- Character forward: **+Z**.
- Units: **meters**.
- Origin: centered between the feet at ground height (`Y = 0`) in the bind pose.
- Rest transforms must be applied or intentionally documented. Runtime code must not carry per-model transform repairs.
- A manifest `heightMeters` value describes the expected standing height after normalization. The loader may apply one uniform scale from the measured source height to this value.
- Skeleton, mesh, material, and animation target node names must remain stable after optimization.

## Source locations and approval

`3d_assets/` contains sources that the project owner has explicitly approved for this repository. `asset-intake/characters/` is gitignored and is the only accepted location for future, unapproved character sources.

Approval is split deliberately:

- `repositoryApproved` permits the source record and optimized derivative to be committed to this private/fun project repository.
- `deploymentApproved` permits the optimized derivative to be included in a remotely deployed build.

Repository approval never implies deployment approval. Deployment approval must be changed only when the project owner explicitly approves a release.

The current Daniel source is documented in [daniel-model-inspection.md](./daniel-model-inspection.md). The source file is preserved byte-for-byte; the browser receives only `public/models/characters/daniel.glb`.

## Accepted inputs

- Preferred: one `.glb` file with embedded textures.
- Accepted with packaging review: `.gltf` plus every referenced buffer and image.
- Conditional: `.fbx` only when the user supplies an approved conversion tool or re-exports it as GLB. This project does not install Blender or silently convert FBX files.

For every new source, record its owner/author, origin, redistribution terms, approval state, source hash, dimensions, topology, materials, textures, skeleton, animation clips, and validator findings before producing a derivative.

## Runtime profile

The `ps1-character` profile:

- keeps a single browser-ready GLB per character;
- targets **64–256 px** textures according to expected screen size;
- removes normal and metallic/roughness textures unless a visual comparison proves they improve the intended PS1 style;
- prunes unused data, deduplicates resources, and applies Meshopt compression;
- keeps only clips declared at optimization time;
- targets at most **2 MiB** per initial character GLB;
- preserves skinning and stable node names; and
- leaves axes and scale untouched, with normalization described by `heightMeters` in the manifest.

The scene loader must configure `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` before loading these files. It loads a GLB once, clones the skinned hierarchy for each logical cast slot, shares geometry/textures, and gives every clone independent animation, tint, and ghost state. Failure to load one character must use that slot's placeholder without hiding the rest of the cast.

## Semantic animations

Runtime code addresses semantic actions, not source clip names. Each manifest `animationMap` maps only these keys:

| Semantic action | Meaning |
| --- | --- |
| `Idle` | Normal camp idle |
| `ReactPositive` | Agreement or celebration |
| `ReactFunny` | Comedic reaction |
| `Panic` | Fear or danger reaction |
| `Hurt` | Non-lethal impact |
| `Death` | Transition to ghost state |
| `OnFire` | Fire consequence |
| `GhostIdle` | Ghost idle; material and offset are runtime effects |

Source clips do not need to be renamed. Every mapped clip must exist in the optimized GLB.

## Audio intake

Only original recordings or assets whose license explicitly permits redistribution may be added. Every enabled cue records its source URL, author, license, attribution, loop flag, category, default gain, and maximum file size. Runtime URLs stay local to `/audio/`, and browser formats are limited to `.ogg`, `.mp3`, and `.wav`.

Effects should be short and compressed. Ambient loops should loop cleanly and remain subtle. A missing, blocked, or undecodable cue falls back to silence and can never block gameplay. Manifest entries may reserve stable IDs with `available: false`; those records do not represent licensed media and must not have a file committed at their URL.
