# Island Game Asset Prompt Catalog V1

**Project:** Island of Extremely Questionable Judgment  
**Style dependency:** Prepend the complete `ISLAND_ASSET_STYLE_LOCK_V1` master prompt supplied by the project owner to every prompt below.  
**Purpose:** Generate one clean reference image per asset for later image-to-3D reconstruction and GLB production.

## Locked assumptions

- The tone is credible tropical survival with slightly exaggerated silhouettes and occasional dark-comedy details, not military realism or cartoon parody.
- The island uses one ancient volcanic mountain formation with two interchangeable states: dormant and active.
- Crafted equipment must look primitive, believable, and structurally functional. It should primarily use wood, stone, reeds, plant fiber, and rope rather than convenient aircraft debris.
- Weapons are practical survival tools. Crossbows, compound bows, knives, machetes, axes, and spears must avoid fantasy, ornamental, or modern military styling.
- Assets are designed for a fixed elevated/isometric game camera and must read at medium distance.
- A standing adult character is approximately 1.76 m tall.
- Positive Z is the asset's forward direction. Y is up.
- Environment asset pivots belong at ground contact, centered in X/Z unless stated otherwise.
- Hand-held item pivots belong at the center of the intended dominant-hand grip. The item's forward/use direction points toward positive Z.
- Reference images contain no people, hands, rulers, text, terrain islands, or secondary props.
- Triangle budgets below are production targets for the reconstructed GLB, not promises made by an image generator.

## Production tiers

| Tier | Intended use | Triangle target | Texture target | Collision |
|---|---|---:|---:|---|
| S | tiny repeated ground detail | 40–180 | vertex color or 64 px | none |
| M | vegetation and ordinary props | 150–700 | vertex color or 64–128 px | primitive |
| L | hero props, trees, vehicles | 600–2,500 | 128–256 px | simple compound mesh |
| XL | landmarks and wreck modules | 1,500–6,000 | 256–512 px | authored proxy |

## Current project assets

These prompts replace or refine geometry currently generated in `src/scene/world/Island.tsx`.

### ENV-PALM-01 — Mature tropical palm

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Mature Tropical Palm 01
ASSET CATEGORY: Vegetation / Tree
DESCRIPTION:
Create exactly ONE mature tropical palm with a gently leaning trunk and a broad, wind-shaped crown. It should look native to an exposed island coast and remain readable from an elevated isometric camera.
DIMENSIONS:
- Width (X): 6.0 meters
- Height (Y): 8.5 meters
- Depth (Z): 6.0 meters
GEOMETRY:
- One continuous tapered trunk made from 8–10 visibly faceted sections, five or six sides around.
- Slight irregular bend, heavier at the base, no smooth cylinder.
- Seven broad palm fronds radiating asymmetrically from one connected crown.
- Each frond is a sturdy angular central blade with 4–6 large triangular leaf masses, not thin leaflets.
- Target reconstructed mesh: 500–900 triangles.
MATERIALS:
- Trunk base #614632, main trunk #896445, occasional weathered facets #AD8962.
- Leaves use #345B3C, #4E7A47, and restrained highlights #8AAB62.
- Entirely matte and flat shaded.
SPECIAL DETAILS:
- Crown must read clearly from above.
- No coconuts, vines, flowers, grass, or detached leaves.
GROUND CONTACT:
- Flared trunk base rests at Y=0 with a centered bottom pivot; no terrain patch.
OUTPUT:
Exactly ONE isolated Mature Tropical Palm 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-FERN-01 — Giant jungle fern

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Giant Jungle Fern 01
ASSET CATEGORY: Vegetation / Ground Plant
DESCRIPTION:
Create exactly ONE dense radial jungle fern with an open center and a low starburst silhouette.
DIMENSIONS: Width (X) 2.8 m; Height (Y) 1.6 m; Depth (Z) 2.8 m.
GEOMETRY:
- One short five-sided central stem cluster.
- Seven large arching fronds, each formed from one thick angular spine and 3–5 broad connected polygon leaf masses.
- Fronds must be substantial enough for reliable image-to-3D reconstruction; no fine leaf teeth.
- Target reconstructed mesh: 250–500 triangles.
MATERIALS:
- Stem #614632; alternating fronds #345B3C and #4E7A47; upper facets #778B4B.
SPECIAL DETAILS:
- Uneven frond heights and rotations, but a clean connected silhouette.
- No flowers, soil, rocks, or separate loose leaves.
GROUND CONTACT:
- Compact central crown sits at Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Giant Jungle Fern 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-BANANA-01 — Broadleaf banana plant

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Broadleaf Banana Plant 01
ASSET CATEGORY: Vegetation / Large Plant
DESCRIPTION:
Create exactly ONE young wild banana plant with a short layered pseudostem and six huge angular leaves.
DIMENSIONS: Width (X) 3.2 m; Height (Y) 3.6 m; Depth (Z) 3.0 m.
GEOMETRY:
- Thick tapered five-sided pseudostem assembled as 3 overlapping leaf sheaths.
- Six paddle-shaped leaves on sturdy connected stalks, bent into large faceted planes.
- Two leaves may have one bold geometric split; avoid shredded edges and thin strands.
- Target reconstructed mesh: 350–700 triangles.
MATERIALS:
- Stem #896445 mixed with olive #778B4B.
- Leaves #345B3C, #4E7A47, #778B4B, with sparse #8AAB62 facets.
SPECIAL DETAILS:
- No fruit bunch, flowers, dew, or surrounding plants.
- Strong top-view readability.
GROUND CONTACT:
- Wide layered stem base at Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Broadleaf Banana Plant 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-BUSH-01 — Tropical bush

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Dense Tropical Bush 01
ASSET CATEGORY: Vegetation / Shrub
DESCRIPTION:
Create exactly ONE compact tropical bush formed from five connected, irregular faceted foliage masses.
DIMENSIONS: Width (X) 1.8 m; Height (Y) 1.15 m; Depth (Z) 1.6 m.
GEOMETRY:
- Five overlapping low-poly dodecahedral foliage clumps with a few angular leaf tips integrated into the silhouette.
- A barely visible connected woody core; no floating clumps.
- Asymmetrical dome shape, wider at the bottom.
- Target reconstructed mesh: 180–350 triangles.
MATERIALS:
- Main foliage #4E7A47; shadow masses #345B3C; sparse upper facets #778B4B.
- Tiny visible stems #614632.
SPECIAL DETAILS:
- No berries, flowers, vines, or terrain patch.
GROUND CONTACT:
- Broad foliage and hidden stem base touch Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Dense Tropical Bush 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-ROCK-01 — Coastal boulder

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Coastal Boulder 01
ASSET CATEGORY: Rock / Environment
DESCRIPTION:
Create exactly ONE heavy, salt-weathered coastal boulder with a squat asymmetrical silhouette and one broken planar face.
DIMENSIONS: Width (X) 3.2 m; Height (Y) 2.1 m; Depth (Z) 2.7 m.
GEOMETRY:
- One connected irregular 10–16-face rock mass.
- Broad base, offset top ridge, several large triangulated planes, no small chips.
- Target reconstructed mesh: 40–100 triangles.
MATERIALS:
- Main stone #71777A; shaded faces #454B50; sun-facing faces #999D9B.
- Optional very restrained olive-gray face near the base, without moss texture.
SPECIAL DETAILS:
- Dry rock only; no foam, water, shells, plants, or sand.
GROUND CONTACT:
- Flat stable underside at Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Coastal Boulder 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-SEASTACK-01 — Offshore sea stack

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Offshore Sea Stack 01
ASSET CATEGORY: Rock / Landmark
DESCRIPTION:
Create exactly ONE tall offshore sea stack with a broad wave-cut base and a narrow leaning crown.
DIMENSIONS: Width (X) 18 m; Height (Y) 25 m; Depth (Z) 16 m.
GEOMETRY:
- One connected rock formation made of a low wide base mass and a five-sided tapered upper spire.
- Strong irregular faceted silhouette with approximately 25–45 large visible faces.
- No floating pieces or undercut thin arches.
- Target reconstructed mesh: 100–250 triangles.
MATERIALS:
- Wet lower faces #454B50; main mass #71777A; upper sun faces #999D9B.
SPECIAL DETAILS:
- Do not include the current procedural foam ring; foam remains a runtime water effect.
- No ocean, birds, moss, or terrain platform.
GROUND CONTACT:
- Broad flat seabed contact at Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Offshore Sea Stack 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-MOUNTAIN-01 — Volcanic mountain base

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Island Volcanic Mountain Base 01
ASSET CATEGORY: Terrain / Landmark
DESCRIPTION:
Create exactly ONE modular island mountain mass that can replace the current faceted mountain. It is an ancient volcanic formation with a summit socket designed to receive either the dormant or active crater insert, plus two lower shoulder peaks.
DIMENSIONS: Width (X) 140 m; Height (Y) 70 m above its base; Depth (Z) 130 m.
GEOMETRY:
- Broad nine-sided base rising in 4–6 coarse faceted elevation bands.
- Main summit is offset slightly and widened into an approximately 36 x 30 m crown. Preserve a flat 22 x 18 m gameplay clearing on the front side and place a separate 24 x 21 m crater-insert socket immediately behind it.
- Two integrated shoulder peaks, one lower on each side; all masses must join cleanly.
- Large navigable slopes; avoid needles, caves, overhangs, or loose rocks.
- Target reconstructed mesh: 1,500–3,500 triangles.
MATERIALS:
- Lower earth #65513F and #997650.
- Main rock #71777A and #454B50.
- Sparse highland facets #778B4B; lighter exposed faces #999D9B.
SPECIAL DETAILS:
- No crater rim, lava, smoke, snow, trees, waterfall, trails, or separate terrain base.
- The summit socket must be visually natural and mostly hidden after either crater state is installed.
GROUND CONTACT:
- Entire broad footprint terminates on one flat Y=0 plane; pivot at footprint center.
CAMERA OVERRIDE:
- Three-quarter orthographic view elevated 40 degrees so the summit and all slopes are visible.
OUTPUT:
Exactly ONE isolated Island Volcanic Mountain Base 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-WATERFALL-CLIFF-01 — Waterfall cliff module

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Waterfall Cliff Module 01
ASSET CATEGORY: Terrain / Water Feature Support
DESCRIPTION:
Create exactly ONE rock cliff module shaped to receive a separate runtime waterfall ribbon and connect an upper stream to a lower pool.
DIMENSIONS: Width (X) 14 m; Height (Y) 18 m; Depth (Z) 8 m.
GEOMETRY:
- One broad faceted cliff wall with a shallow central water channel, an upper lip, and a recessed lower splash notch.
- Stable side buttresses; no cave, bridge, loose stones, or actual modeled water.
- Back and underside should look closed and reconstructable.
- Target reconstructed mesh: 400–900 triangles.
MATERIALS:
- Main rock #71777A; deep wet channel #454B50; upper faces #999D9B; sparse olive facets #778B4B.
SPECIAL DETAILS:
- Keep a clear 6 m wide center path for the runtime waterfall effect.
- No water, mist, foam, plants, or pool in the reference.
GROUND CONTACT:
- Flat base at Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Waterfall Cliff Module 01 matching the MASTER ASSET STYLE LOCK.
```

### VEH-WRECK-01 — Crashed aircraft fuselage

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Crashed Commuter Aircraft Fuselage 01
ASSET CATEGORY: Crash Site / Vehicle Wreck
DESCRIPTION:
Create exactly ONE damaged low-poly commuter aircraft fuselage section suitable for eight survivors. The cabin is torn open along one side so four rows of two seats remain visible from an elevated isometric camera.
DIMENSIONS: Width (X) 4.2 m; Height (Y) 4.0 m; Depth (Z) 24 m, with the nose toward positive Z.
GEOMETRY:
- Seven- or eight-sided tubular fuselage, blunt faceted nose, broken rear edge, and open side wall.
- Interior floor and eight chunky seats in four rows of two are connected within the primary object.
- Torn edges use a few thick angular panels; no wires, shards, or fragile strips.
- Exclude full wings and tail because they are separate modules.
- Target reconstructed mesh: 2,500–5,000 triangles.
MATERIALS:
- Exterior weathered warm gray #999D9B and #71777A; darker damaged faces #454B50.
- Interior panels muted beige near #D6BC85.
- Seats #614632 and #896445; one restrained orange safety panel.
- No airline logo, registration, text, or national markings.
SPECIAL DETAILS:
- Must look crashed and grounded, not airworthy, but should avoid gore, fire, and active smoke.
- Seat layout must remain legible.
GROUND CONTACT:
- Flattened damaged belly rests at Y=0; pivot centered on fuselage footprint.
OUTPUT:
Exactly ONE isolated Crashed Commuter Aircraft Fuselage 01 matching the MASTER ASSET STYLE LOCK.
```

### VEH-WRECK-02 — Broken wing section

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Broken Aircraft Wing 01
ASSET CATEGORY: Crash Site / Debris
DESCRIPTION:
Create exactly ONE detached aircraft wing section, bent slightly and broken at the root, for placement near the crashed fuselage.
DIMENSIONS: Width (X) 10 m from broken root to tip; Height (Y) 0.65 m; Depth (Z) 4.2 m.
GEOMETRY:
- Thick low-poly tapered wing with 3–4 major top facets, blunt leading edge, damaged angular root, and slightly drooping tip.
- No engine, landing gear, wires, flames, or tiny fragments.
- Target reconstructed mesh: 350–800 triangles.
MATERIALS:
- Warm gray #999D9B and #71777A; damaged root #454B50; one small faded orange panel without text.
GROUND CONTACT:
- Lower surface has two stable contact areas at Y=0; pivot near the broken root for scene alignment.
OUTPUT:
Exactly ONE isolated Broken Aircraft Wing 01 matching the MASTER ASSET STYLE LOCK.
```

### VEH-WRECK-03 — Tail section

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Broken Aircraft Tail 01
ASSET CATEGORY: Crash Site / Debris
DESCRIPTION:
Create exactly ONE detached rear fuselage and tail assembly lying at a slight angle, recognizable as part of the same commuter aircraft.
DIMENSIONS: Width (X) 6.5 m; Height (Y) 4.5 m; Depth (Z) 6.0 m.
GEOMETRY:
- Short faceted rear fuselage section, one thick vertical stabilizer, and two sturdy horizontal stabilizers.
- Jagged but thick broken front rim; no wires or loose shards.
- Target reconstructed mesh: 600–1,200 triangles.
MATERIALS:
- Same warm gray family as the fuselage: #999D9B, #71777A, damage #454B50.
- No logo, text, or identifying livery.
GROUND CONTACT:
- Crushed lower fuselage and one stabilizer touch Y=0; pivot centered beneath the rear fuselage.
OUTPUT:
Exactly ONE isolated Broken Aircraft Tail 01 matching the MASTER ASSET STYLE LOCK.
```

## Additional flora and natural assets

### ENV-TREE-02 — Jungle broadleaf tree

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Jungle Broadleaf Tree 01
ASSET CATEGORY: Vegetation / Tree
DESCRIPTION:
Create exactly ONE mature tropical broadleaf tree with a forked trunk and a layered asymmetrical canopy.
DIMENSIONS: Width (X) 8 m; Height (Y) 10 m; Depth (Z) 7 m.
GEOMETRY:
- Six-sided trunk splitting into three thick connected branches above 3 m.
- Canopy made from 7–10 overlapping angular foliage masses with clear gaps between the three main lobes.
- No individual leaf cards, thin twigs, vines, fruit, or roots extending far from the trunk.
- Target reconstructed mesh: 700–1,300 triangles.
MATERIALS:
- Trunk #614632 and #896445; canopy #345B3C, #4E7A47, #778B4B; sparse #8AAB62 upper facets.
GROUND CONTACT:
- Slightly flared stable trunk base at Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Jungle Broadleaf Tree 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-TREE-03 — Dead storm tree

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Dead Storm Tree 01
ASSET CATEGORY: Vegetation / Dead Tree
DESCRIPTION:
Create exactly ONE leafless tropical tree killed by storms, with a leaning snapped trunk and four thick branch stubs.
DIMENSIONS: Width (X) 4.5 m; Height (Y) 6.5 m; Depth (Z) 3.5 m.
GEOMETRY:
- One tapered angular trunk with a strong lean, six sides around, ending in a blunt broken top.
- Four connected branches, all thick and short enough for robust reconstruction.
- Target reconstructed mesh: 180–350 triangles.
MATERIALS:
- Dark wood #614632, main weathered wood #896445, broken faces #AD8962.
SPECIAL DETAILS:
- No leaves, vines, birds, hollow eyes, skull shapes, or ground debris.
GROUND CONTACT:
- Broad stable trunk base at Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Dead Storm Tree 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-GRASS-01 — Grass clump

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Tropical Grass Clump 01
ASSET CATEGORY: Vegetation / Ground Cover
DESCRIPTION:
Create exactly ONE chunky low-poly grass clump for repeated terrain dressing.
DIMENSIONS: Width (X) 0.9 m; Height (Y) 0.65 m; Depth (Z) 0.8 m.
GEOMETRY:
- 9–12 broad tapered blade wedges emerging from one connected crown.
- Blades are thick folded polygons, not realistic strands or transparent cards.
- Target reconstructed mesh: 50–100 triangles.
MATERIALS:
- #345B3C at the base, #4E7A47 and #778B4B on blades, sparse #8AAB62 tips.
GROUND CONTACT:
- Compact crown at Y=0; bottom-center pivot; no soil patch.
OUTPUT:
Exactly ONE isolated Tropical Grass Clump 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-LEAFPLANT-01 — Elephant-ear plant

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Elephant Ear Plant 01
ASSET CATEGORY: Vegetation / Ground Plant
DESCRIPTION:
Create exactly ONE tropical elephant-ear plant with five oversized heart-shaped angular leaves.
DIMENSIONS: Width (X) 2.2 m; Height (Y) 1.9 m; Depth (Z) 2.0 m.
GEOMETRY:
- Five thick short connected stems around one base.
- Each leaf is a broad low-poly shield with 5–8 large facets and a folded central ridge.
- No holes, droplets, fine veins, or transparent cards.
- Target reconstructed mesh: 180–350 triangles.
MATERIALS:
- Stems #778B4B; leaves #345B3C, #4E7A47, and #8AAB62 on upper facets.
GROUND CONTACT:
- Shared stem crown at Y=0; bottom-center pivot.
OUTPUT:
Exactly ONE isolated Elephant Ear Plant 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-DRIFTWOOD-01 — Driftwood log

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Forked Driftwood Log 01
ASSET CATEGORY: Environment Prop / Natural Debris
DESCRIPTION:
Create exactly ONE sun-bleached driftwood log with a thick fork at one end.
DIMENSIONS: Width (X) 0.65 m; Height (Y) 0.75 m; Depth (Z) 4.2 m.
GEOMETRY:
- Angular six-sided trunk, gently bent, with one thick fork and two blunt broken branch nubs.
- Target reconstructed mesh: 100–220 triangles.
MATERIALS:
- Weathered wood #AD8962; shadow facets #896445; dark end grain #614632.
SPECIAL DETAILS:
- No rope, shells, seaweed, sand, or water.
GROUND CONTACT:
- Lying horizontally with three stable contacts at Y=0; pivot at footprint center.
OUTPUT:
Exactly ONE isolated Forked Driftwood Log 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-VOLCANO-01 — Dormant volcanic crater insert

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Dormant Volcanic Crater Insert 01
ASSET CATEGORY: Terrain / Landmark Module
DESCRIPTION:
Create exactly ONE dormant crater-rim insert that can sit on a mountain summit. It is ancient, dry, and inactive.
DIMENSIONS: Width (X) 24 m; Height (Y) 5 m; Depth (Z) 21 m.
GEOMETRY:
- Irregular eight- or nine-sided raised rim surrounding a broad shallow central depression.
- One lower broken rim section creates a walkable entry.
- Coarse triangulated slopes; no deep shaft or undercuts.
- Target reconstructed mesh: 500–1,000 triangles.
MATERIALS:
- Outer rock #71777A, inner charcoal #454B50, dusty facets #65513F and #997650.
SPECIAL DETAILS:
- No lava, glow, smoke, ash plume, vegetation, skulls, or surrounding mountain.
GROUND CONTACT:
- Flat annular underside at Y=0; pivot at crater center.
CAMERA OVERRIDE:
- Three-quarter orthographic view elevated 45 degrees so the crater depression is clearly visible.
OUTPUT:
Exactly ONE isolated Dormant Volcanic Crater Insert 01 matching the MASTER ASSET STYLE LOCK.
```

### ENV-VOLCANO-02 — Active volcanic crater insert

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Active Volcanic Crater Insert 01
ASSET CATEGORY: Terrain / Landmark State Module
DESCRIPTION:
Create exactly ONE active version of the same ancient crater insert. It must share the dormant crater's exact outer footprint and silhouette so the two assets can be exchanged at runtime, while showing fresh fractured inner rock and a clearly visible lava pool deep inside the crater.
DIMENSIONS: Width (X) 24 m; Height (Y) 5 m; Depth (Z) 21 m.
GEOMETRY:
- Match the dormant insert's irregular eight- or nine-sided outer rim and lower walkable entry exactly.
- Add 5–7 large fresh fracture planes on the inner rim without changing the outer footprint.
- Include one recessed, connected low-poly lava surface inside the broad shallow depression.
- Keep the crater navigable around the rim; avoid deep shafts, thin rock needles, loose stones, or floating chunks.
- Target reconstructed mesh: 650–1,200 triangles.
MATERIALS:
- Outer rock #71777A and #454B50; fresh inner fractures use darker charcoal near #30363A.
- Lava uses restrained burnt orange and dark red-orange broad polygon regions; keep saturation controlled and avoid white-hot highlights.
- Lava may use a very weak emissive material in the final GLB, but the reference must retain flat polygon readability.
SPECIAL DETAILS:
- No eruption column, airborne rocks, explosion, smoke, sparks, fire, ash cloud, vegetation, or surrounding mountain.
- Smoke, ash, heat shimmer, and eruption particles remain separate runtime effects.
- The active state must still resemble the same crater as `ENV-VOLCANO-01`, not a new volcano.
GROUND CONTACT:
- Exact same flat annular underside and center pivot as `ENV-VOLCANO-01`.
CAMERA OVERRIDE:
- Use the same three-quarter orthographic camera and 45-degree elevation as the dormant crater reference so the two images can be compared directly.
OUTPUT:
Exactly ONE isolated Active Volcanic Crater Insert 01 matching the MASTER ASSET STYLE LOCK.
```

## Boats and transport

### VEH-BOAT-01 — Fiberglass rescue skiff

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Weathered Rescue Skiff 01
ASSET CATEGORY: Vehicle / Boat
DESCRIPTION:
Create exactly ONE small open fiberglass motor skiff that can carry four survivors, weathered but usable.
DIMENSIONS: Width (X) 2.0 m; Height (Y) 1.5 m including motor; Depth (Z) 5.2 m, bow toward positive Z.
GEOMETRY:
- Angular V-shaped hull with visible interior floor, two bench seats, low transom, and one chunky simplified outboard motor.
- Hull rim and seats must be thick; no railings, cables, propeller blades, or tiny controls.
- Target reconstructed mesh: 900–1,800 triangles.
MATERIALS:
- Faded hull #999D9B and #D6BC85; inner shadows #71777A; seats #AD8962; motor #454B50.
SPECIAL DETAILS:
- No logo, registration number, fishing gear, anchor, water, wake, or passengers.
GROUND CONTACT:
- Modeling pivot at hull centerline on the designed waterline; show asset upright on a hidden studio support with no visible stand or ground plane.
OUTPUT:
Exactly ONE isolated Weathered Rescue Skiff 01 matching the MASTER ASSET STYLE LOCK.
```

### VEH-RAFT-01 — Crafted survival raft

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Improvised Survival Raft 01
ASSET CATEGORY: Crafted Vehicle / Raft
DESCRIPTION:
Create exactly ONE believable primitive raft built entirely from island materials, large enough for four survivors.
DIMENSIONS: Width (X) 3.0 m; Height (Y) 0.65 m; Depth (Z) 4.2 m, bow toward positive Z.
GEOMETRY:
- Six thick parallel logs joined by three crossbars.
- Four large visible rope lashings represented as chunky low-sided bands, not thin coils.
- A tightly bound layer of broad split-bamboo slats reinforces the center standing area.
- Slightly uneven but structurally readable silhouette; no sail in this version.
- Target reconstructed mesh: 700–1,400 triangles.
MATERIALS:
- Logs #614632, #896445, and #AD8962; rope muted tan #D6BC85; bamboo slats #AD8962 and #778B4B.
SPECIAL DETAILS:
- No tools, cargo, people, water, wake, flag, or separate paddle.
GROUND CONTACT:
- Pivot at raft center on its waterline; underside is closed and coherent.
OUTPUT:
Exactly ONE isolated Improvised Survival Raft 01 matching the MASTER ASSET STYLE LOCK.
```

## Survival and found items

All prompts in this section use a grip pivot at the intended dominant-hand hold point unless a different pivot is stated. They should be oriented as if held or used toward positive Z.

### ITEM-KNIFE-01 — Survival knife

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Survival Knife 01
ASSET CATEGORY: Handheld Prop / Tool
DESCRIPTION:
Create exactly ONE rugged fixed-blade survival knife with a broad blade, compact guard, and wrapped handle.
DIMENSIONS: Width (X) 0.06 m; Height (Y) 0.045 m; Depth (Z) 0.34 m.
GEOMETRY:
- Thick angular single-edged blade with a faceted clipped point.
- Chunky simple guard and eight-sided handle; wrap shown as 3–4 broad geometric bands.
- No serration teeth, engraving, sheath, blood, or separate accessories.
- Target reconstructed mesh: 120–250 triangles.
MATERIALS:
- Blade #999D9B with #71777A shadow face; guard #454B50; handle #614632 and #896445.
SPECIAL DETAILS:
- Camera close enough for the item to fill most of the frame.
- Grip pivot at handle center; blade points positive Z.
OUTPUT:
Exactly ONE isolated Survival Knife 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-LIGHTER-01 — Pocket lighter

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Pocket Lighter 01
ASSET CATEGORY: Handheld Prop / Survival Item
DESCRIPTION:
Create exactly ONE chunky metal pocket lighter with its lid open, recognizable at game-camera distance.
DIMENSIONS: Width (X) 0.04 m; Height (Y) 0.065 m; Depth (Z) 0.018 m.
GEOMETRY:
- Boxy faceted body, thick hinged open lid, simplified perforated chimney, and one large striker wheel.
- Components must connect robustly; no flame, fuel label, logo, text, or tiny hinge pin.
- Target reconstructed mesh: 100–220 triangles.
MATERIALS:
- Main metal #71777A and #999D9B; dark chimney #454B50; one muted orange body panel.
SPECIAL DETAILS:
- Use a tighter three-quarter orthographic product view because of the small size.
- Grip pivot at lower body center; upright use direction is positive Y.
OUTPUT:
Exactly ONE isolated Pocket Lighter 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-ROPE-01 — Coiled rope

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Coiled Utility Rope 01
ASSET CATEGORY: Handheld Prop / Survival Item
DESCRIPTION:
Create exactly ONE compact coil of thick utility rope with one short tucked end.
DIMENSIONS: Width (X) 0.28 m; Height (Y) 0.10 m; Depth (Z) 0.28 m.
GEOMETRY:
- One connected low-sided torus-like coil represented by 3–4 broad stacked loops.
- One short thick rope end crosses the coil and remains connected.
- No fine fibers, knot complexity, hook, label, or loose long tail.
- Target reconstructed mesh: 140–280 triangles.
MATERIALS:
- Main rope #D6BC85; shadow facets #AD8962; restrained dark recesses #896445.
SPECIAL DETAILS:
- Carry pivot at center of coil.
OUTPUT:
Exactly ONE isolated Coiled Utility Rope 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-BINOCULARS-01 — Binoculars

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Compact Binoculars 01
ASSET CATEGORY: Handheld Prop / Observation Tool
DESCRIPTION:
Create exactly ONE pair of compact field binoculars with a sturdy central bridge.
DIMENSIONS: Width (X) 0.18 m; Height (Y) 0.09 m; Depth (Z) 0.16 m.
GEOMETRY:
- Two connected six-sided tapered barrels, thick center bridge, large eyepiece rings, and simple focus wheel.
- No strap, lens reflections, brand, text, or tiny knobs.
- Target reconstructed mesh: 180–350 triangles.
MATERIALS:
- Body #454B50; grip facets deep forest green #345B3C; lens faces very dark desaturated blue #244D69 with no gloss.
SPECIAL DETAILS:
- Grip pivot under the central bridge; viewing direction positive Z.
OUTPUT:
Exactly ONE isolated Compact Binoculars 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-FLARE-01 — Distress flare

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Handheld Distress Flare 01
ASSET CATEGORY: Handheld Prop / Signal Item
DESCRIPTION:
Create exactly ONE unused handheld marine distress flare with a thick capped cylinder and an obvious grip zone.
DIMENSIONS: Width (X) 0.045 m; Height (Y) 0.045 m; Depth (Z) 0.30 m.
GEOMETRY:
- Eight-sided main tube, thick end cap, one raised ignition collar, and a broad contrasting safety band.
- No flame, smoke, sparks, text, symbols, or separate cap.
- Target reconstructed mesh: 70–150 triangles.
MATERIALS:
- Main body restrained safety orange; cap #454B50; collar #999D9B; muted beige band #D6BC85.
SPECIAL DETAILS:
- Grip pivot at lower half center; flare points positive Z.
OUTPUT:
Exactly ONE isolated Handheld Distress Flare 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-MEDKIT-01 — First-aid kit

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Salvaged First Aid Kit 01
ASSET CATEGORY: Handheld Prop / Medical Item
DESCRIPTION:
Create exactly ONE compact hard-shell first-aid case salvaged from an aircraft.
DIMENSIONS: Width (X) 0.32 m; Height (Y) 0.22 m; Depth (Z) 0.12 m.
GEOMETRY:
- Boxy eight-vertex case with thick handle, two broad latches, and one raised simple cross-shaped color panel.
- The cross is geometry/color only, with no writing or trademarked markings.
- No loose bandages, bottles, labels, or open interior.
- Target reconstructed mesh: 180–320 triangles.
MATERIALS:
- Case warm gray #999D9B and #71777A; handle #454B50; muted desaturated red-orange cross panel.
SPECIAL DETAILS:
- Carry pivot at handle center; case hangs below it.
OUTPUT:
Exactly ONE isolated Salvaged First Aid Kit 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-CANTEEN-01 — Water canteen

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Metal Water Canteen 01
ASSET CATEGORY: Handheld Prop / Survival Item
DESCRIPTION:
Create exactly ONE compact metal canteen with a broad body, short neck, and attached chunky cap.
DIMENSIONS: Width (X) 0.18 m; Height (Y) 0.24 m; Depth (Z) 0.08 m.
GEOMETRY:
- Flattened eight-sided bottle body, short neck, large cap, and two thick side loops.
- No chain, fabric cover, logo, text, dents, or separate cup.
- Target reconstructed mesh: 120–240 triangles.
MATERIALS:
- Body #71777A and #999D9B; cap #454B50; side loops #614632.
SPECIAL DETAILS:
- Grip pivot at upper neck; upright direction positive Y.
OUTPUT:
Exactly ONE isolated Metal Water Canteen 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-MACHETE-01 — Machete

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Jungle Machete 01
ASSET CATEGORY: Handheld Prop / Tool
DESCRIPTION:
Create exactly ONE practical jungle machete with a broad forward-heavy blade and simple durable handle.
DIMENSIONS: Width (X) 0.07 m; Height (Y) 0.035 m; Depth (Z) 0.62 m.
GEOMETRY:
- Thick low-poly blade with a gently widening tip and 4–6 large faces.
- Eight-sided handle with a broad end stop; no guard, saw teeth, sheath, engraving, or blood.
- Target reconstructed mesh: 100–220 triangles.
MATERIALS:
- Blade #71777A and #999D9B; handle #614632 with #896445 facets.
SPECIAL DETAILS:
- Grip pivot at handle center; blade points positive Z.
OUTPUT:
Exactly ONE isolated Jungle Machete 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-FLASHLIGHT-01 — Flashlight

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Heavy Flashlight 01
ASSET CATEGORY: Handheld Prop / Light Tool
DESCRIPTION:
Create exactly ONE heavy weather-resistant flashlight with a wide faceted lamp head and thick grip.
DIMENSIONS: Width (X) 0.09 m; Height (Y) 0.09 m; Depth (Z) 0.28 m.
GEOMETRY:
- Eight-sided cylindrical grip, wider polygonal lamp head, thick lens disk, and one oversized switch.
- No light beam, glow, battery, strap, logo, or knurling.
- Target reconstructed mesh: 100–220 triangles.
MATERIALS:
- Body #454B50; head facets #71777A; lens #438B9E but matte and unlit; switch muted orange.
SPECIAL DETAILS:
- Grip pivot at handle center; beam direction positive Z.
OUTPUT:
Exactly ONE isolated Heavy Flashlight 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-CROSSBOW-01 — Compact crossbow

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Compact Survival Crossbow 01
ASSET CATEGORY: Handheld Prop / Ranged Tool
DESCRIPTION:
Create exactly ONE compact utilitarian survival crossbow built as a practical hunting and survival tool, with sturdy components for clear game readability.
DIMENSIONS: Width (X) 0.72 m; Height (Y) 0.25 m; Depth (Z) 0.85 m.
GEOMETRY:
- Thick wooden stock, short central rail, broad low-poly bow limbs, one chunky trigger guard, and one loaded bolt integrated on the rail.
- Bowstring is a single robust low-poly cord at least 1 cm visually thick, not hair-thin.
- No scope, quiver, camouflage, tactical accessories, or decorative spikes.
- Target reconstructed mesh: 450–900 triangles.
MATERIALS:
- Stock #614632 and #896445; bow limbs #454B50; fittings and bolt tip #71777A; cord #65513F.
SPECIAL DETAILS:
- Grip pivot at pistol grip center; firing direction positive Z.
- Practical survival tool, not a modern military weapon, historical replica, fantasy weapon, or decorative display piece.
OUTPUT:
Exactly ONE isolated Compact Survival Crossbow 01 matching the MASTER ASSET STYLE LOCK.
```

## Crafted items

### CRAFT-SPEAR-01 — Improvised spear

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Improvised Stone Spear 01
ASSET CATEGORY: Crafted Item / Handheld Tool
DESCRIPTION:
Create exactly ONE improvised spear made from a straight wooden shaft, a chipped stone point, and chunky rope lashings.
DIMENSIONS: Width (X) 0.10 m; Height (Y) 0.10 m; Depth (Z) 1.9 m.
GEOMETRY:
- Six-sided slightly irregular shaft, one broad faceted stone point, and 3–4 thick connected lashing bands.
- No feathers, blood, carvings, dangling fibers, or separate pieces.
- Target reconstructed mesh: 100–220 triangles.
MATERIALS:
- Shaft #896445; stone #454B50 and #71777A; lashings #D6BC85.
SPECIAL DETAILS:
- Grip pivot 0.75 m from the blunt end; point faces positive Z.
OUTPUT:
Exactly ONE isolated Improvised Stone Spear 01 matching the MASTER ASSET STYLE LOCK.
```

### CRAFT-BOW-01 — Improvised bow

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Improvised Survival Bow 01
ASSET CATEGORY: Crafted Item / Handheld Ranged Tool
DESCRIPTION:
Create exactly ONE rough but functional island-made bow with a wrapped center grip.
DIMENSIONS: Width (X) 1.25 m; Height (Y) 0.06 m; Depth (Z) 0.28 m when oriented for holding.
GEOMETRY:
- One connected angular wooden stave with 8–10 broad segments forming a shallow arc.
- Thick low-poly cord joins the tips; center grip uses 3 broad wrap bands.
- No arrow, quiver, feathers, decoration, or fine fibers.
- Target reconstructed mesh: 150–300 triangles.
MATERIALS:
- Bow #614632 and #896445; grip wrap #D6BC85; cord #65513F.
SPECIAL DETAILS:
- Grip pivot at center; arrow direction would be positive Z.
OUTPUT:
Exactly ONE isolated Improvised Survival Bow 01 matching the MASTER ASSET STYLE LOCK.
```

### ITEM-COMPOUND-BOW-01 — Survival compound bow

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Compact Survival Compound Bow 01
ASSET CATEGORY: Handheld Prop / Ranged Survival Tool
DESCRIPTION:
Create exactly ONE modern but rugged compound bow intended for hunting and survival. It should be mechanically recognizable, compact, and practical without tactical or competitive-sport decoration.
DIMENSIONS: Width (X) 0.82 m; Height (Y) 0.10 m; Depth (Z) 0.38 m when oriented for holding.
GEOMETRY:
- One thick angular central riser with an integrated hand grip.
- Two sturdy short limbs and two large low-sided polygonal cams.
- Bow cables are simplified into a small number of robust connected cords thick enough for image-to-3D reconstruction.
- Include one simple arrow rest, but no arrow, sight, stabilizer rod, quiver, release aid, or accessory package.
- Target reconstructed mesh: 450–850 triangles.
MATERIALS:
- Riser and cams #454B50 and #71777A.
- Limbs use deep forest green #345B3C with charcoal facets.
- Grip #614632; cables #65513F.
SPECIAL DETAILS:
- Grip pivot at the center of the riser handle; arrow direction would be positive Z.
- Practical survival equipment only: no camouflage texture, neon strings, brand marks, text, ornamental carving, fantasy shapes, or military accessories.
- All cables and limb connections must read as one mechanically coherent object.
OUTPUT:
Exactly ONE isolated Compact Survival Compound Bow 01 matching the MASTER ASSET STYLE LOCK.
```

### CRAFT-AXE-01 — Stone axe

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Improvised Stone Axe 01
ASSET CATEGORY: Crafted Item / Handheld Tool
DESCRIPTION:
Create exactly ONE compact stone axe built from a forked wood handle, chipped stone head, and heavy rope lashings.
DIMENSIONS: Width (X) 0.24 m; Height (Y) 0.07 m; Depth (Z) 0.55 m.
GEOMETRY:
- Six-sided handle with a slight bend, broad wedge-shaped stone head, and 4 thick lashing bands joining them.
- All parts visibly connected; no dangling fibers or polished metal.
- Target reconstructed mesh: 130–280 triangles.
MATERIALS:
- Handle #896445; stone #454B50 and #71777A; lashings #D6BC85.
SPECIAL DETAILS:
- Grip pivot in lower third of handle; cutting edge faces positive Z.
OUTPUT:
Exactly ONE isolated Improvised Stone Axe 01 matching the MASTER ASSET STYLE LOCK.
```

### CRAFT-TORCH-01 — Unlit torch

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Improvised Unlit Torch 01
ASSET CATEGORY: Crafted Item / Handheld Light
DESCRIPTION:
Create exactly ONE unlit survival torch made from a stout branch with a wrapped fuel head.
DIMENSIONS: Width (X) 0.16 m; Height (Y) 0.16 m; Depth (Z) 0.85 m.
GEOMETRY:
- Six-sided wooden shaft, enlarged top bundle made from 4–5 connected angular cloth or bark wraps, and two thick tying bands.
- No flame, ember, smoke, particles, loose cloth strips, or detached elements.
- Target reconstructed mesh: 100–220 triangles.
MATERIALS:
- Shaft #614632 and #896445; wrap #65513F and #997650; tie #D6BC85.
SPECIAL DETAILS:
- Grip pivot in lower third; torch head points positive Z for the asset contract, then rotates upright in the hand socket.
OUTPUT:
Exactly ONE isolated Improvised Unlit Torch 01 matching the MASTER ASSET STYLE LOCK.
```

### CRAFT-FISH-TRAP-01 — Basket fish trap

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Woven Fish Trap 01
ASSET CATEGORY: Crafted Item / Survival Equipment
DESCRIPTION:
Create exactly ONE chunky funnel-shaped basket fish trap made from broad split reeds.
DIMENSIONS: Width (X) 0.65 m; Height (Y) 0.65 m; Depth (Z) 1.0 m.
GEOMETRY:
- Low-sided tapered basket body with 8 broad longitudinal ribs and 4 thick cross bands.
- Recessed funnel opening represented with robust geometry, not fine weaving.
- One thick carry loop; no bait, fish, rope tail, or water.
- Target reconstructed mesh: 250–500 triangles.
MATERIALS:
- Reeds #AD8962 and #896445; inner recess #614632; tie bands #D6BC85.
SPECIAL DETAILS:
- Carry pivot at top loop center.
GROUND CONTACT:
- Flat lower ribs rest at Y=0 when placed; no terrain patch.
OUTPUT:
Exactly ONE isolated Woven Fish Trap 01 matching the MASTER ASSET STYLE LOCK.
```

## Island wildlife

### Wildlife reference and rigging rules

- Generate exactly one animal per image in a neutral, alert resting pose—not an action scene.
- Preserve clear separation where limbs, wings, fins, or tails join the body so the reconstructed mesh can be rigged.
- Keep mouths closed unless a prompt explicitly overrides this; avoid exposed teeth as the default silhouette.
- Use large anatomical masses and simplified joints rather than realistic muscles, fur strands, feathers, scales, or skin microtexture.
- Land-animal pivots sit at ground level directly below the body center. Swimming and flying-animal pivots sit at the body's center of mass.
- The animal faces positive Z in the eventual GLB. Use a three-quarter orthographic reference that shows the animal's left side, front, and top.
- Eyes must be simple inset or painted shapes. Avoid large cute toy eyes, human expressions, clothing, accessories, blood, wounds, prey, and environmental scenery.
- Wildlife materials share the world's matte, slightly desaturated palette but may introduce restrained species-specific browns, tans, muted blues, and dark red accents.
- Build neutral reference meshes for later animation. Do not depict motion blur, splashes, dust, attacks, or dramatic poses.

### FAUNA-SHARK-01 — Reef shark

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Tropical Reef Shark 01
ASSET CATEGORY: Wildlife / Marine Predator
DESCRIPTION:
Create exactly ONE adult tropical reef shark in a calm neutral swimming pose. It should appear dangerous through its natural silhouette, not through aggression or exaggeration.
DIMENSIONS: Width (X) 1.05 m fin tip to fin tip; Height (Y) 0.75 m; Depth (Z) 2.4 m nose to tail.
GEOMETRY:
- One connected streamlined body with a blunt wedge-shaped snout.
- One sturdy dorsal fin, two broad pectoral fins, two small pelvic fins, and one vertically oriented asymmetrical tail fin.
- Slight lateral curve through the tail for readability, while keeping a neutral riggable pose.
- Closed mouth; gills represented by three broad shallow geometric marks per side, not thin cuts.
- Target reconstructed mesh: 700–1,300 triangles.
MATERIALS:
- Upper body muted blue-gray near #596A70 and #71777A.
- Underside light stone gray #999D9B.
- Fin tips and eye area #454B50; entirely matte.
SPECIAL DETAILS:
- No visible rows of teeth, open mouth, blood, scars, remoras, water, bubbles, or seabed.
- Keep fins thick enough for reconstruction and later animation.
GROUND CONTACT:
- No ground contact. Pivot at body center of mass; swimming direction positive Z.
OUTPUT:
Exactly ONE isolated Tropical Reef Shark 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-SNAKE-01 — Island boa

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Island Boa 01
ASSET CATEGORY: Wildlife / Reptile
DESCRIPTION:
Create exactly ONE medium tropical constrictor snake resting in a loose, open S-shaped coil with its head slightly raised. It should look watchful rather than attacking.
DIMENSIONS: Uncoiled length 2.1 m; displayed Width (X) 1.25 m; Height (Y) 0.38 m; Depth (Z) 1.0 m.
GEOMETRY:
- One continuous tapered body made from 18–24 large low-sided segments.
- Broad wedge-shaped head connected by a readable neck; closed mouth and simple inset eyes.
- Open S coil leaves visible gaps so image-to-3D reconstruction can distinguish the body path.
- Target reconstructed mesh: 500–900 triangles.
MATERIALS:
- Main body olive #778B4B and dark forest green #345B3C.
- Broad irregular saddle markings #65513F; underside muted sand #D6BC85.
SPECIAL DETAILS:
- No tongue, exposed fangs, strike pose, prey, branch, grass, or terrain.
- Pattern uses large color regions only, never individual scales.
GROUND CONTACT:
- Lower coil rests stably at Y=0; pivot below the center of the displayed coil; head faces positive Z.
OUTPUT:
Exactly ONE isolated Island Boa 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-BOAR-01 — Wild island boar

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Wild Island Boar 01
ASSET CATEGORY: Wildlife / Terrestrial Mammal
DESCRIPTION:
Create exactly ONE stocky wild island boar in a neutral four-legged standing pose, matching the boar encounter in the game.
DIMENSIONS: Width (X) 0.65 m; Height (Y) 1.0 m at shoulder; Depth (Z) 1.65 m snout to rump.
GEOMETRY:
- Heavy faceted torso, short thick neck, wedge-shaped head, blunt snout, four sturdy separated legs, small ears, and short tapered tail.
- Two small thick tusks integrated near the closed mouth; no fragile points.
- Bristled back suggested by 5–7 large angular silhouette ridges, not hair strands.
- Target reconstructed mesh: 900–1,600 triangles.
MATERIALS:
- Main coat dark soil brown #65513F; upper facets #614632 and #896445.
- Snout and hooves #454B50; tusks muted sand #D6BC85.
SPECIAL DETAILS:
- Alert natural posture, not charging, snarling, cute, or domesticated.
- No mud, food, collar, wounds, or environment.
GROUND CONTACT:
- All four feet rest on Y=0; pivot between the feet below body center; head faces positive Z.
OUTPUT:
Exactly ONE isolated Wild Island Boar 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-CRAB-01 — Coconut crab

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Coconut Crab 01
ASSET CATEGORY: Wildlife / Coastal Invertebrate
DESCRIPTION:
Create exactly ONE large coconut crab in a neutral walking stance with powerful but non-threatening claws.
DIMENSIONS: Width (X) 0.75 m leg tip to leg tip; Height (Y) 0.38 m; Depth (Z) 0.58 m.
GEOMETRY:
- One heavy faceted abdomen and armored front body.
- Eight sturdy segmented walking legs arranged clearly, plus two thick asymmetrical claws.
- Each limb uses only 2–3 robust sections; avoid needle-thin tips and disconnected joints.
- Two short eye stalks integrated close to the head.
- Target reconstructed mesh: 700–1,300 triangles.
MATERIALS:
- Shell charcoal #454B50, medium stone gray #71777A, muted earthy blue-gray, and restrained dark red-brown accents.
SPECIAL DETAILS:
- No coconut, sand, shell microtexture, water, open claws, or prey.
- Do not make it a cute cartoon crab.
GROUND CONTACT:
- Multiple leg tips rest on Y=0; pivot below body center; head faces positive Z.
OUTPUT:
Exactly ONE isolated Coconut Crab 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-IGUANA-01 — Tropical iguana

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Tropical Island Iguana 01
ASSET CATEGORY: Wildlife / Reptile
DESCRIPTION:
Create exactly ONE medium tropical iguana standing calmly on four legs with a long trailing tail and recognizable low dorsal crest.
DIMENSIONS: Width (X) 0.38 m; Height (Y) 0.42 m; Depth (Z) 1.35 m including tail.
GEOMETRY:
- Low heavy body, four separated bent legs with simplified feet, wedge-shaped head, and one thick tapering tail with a gentle curve.
- Dorsal crest represented by 7–9 connected broad triangular plates, never thin spikes.
- Closed mouth; no dangling dewlap unless represented as one thick integrated polygon plane.
- Target reconstructed mesh: 650–1,200 triangles.
MATERIALS:
- Body #4E7A47 and #778B4B; shadow facets #345B3C; crest and tail bands #65513F.
SPECIAL DETAILS:
- No individual scales, tongue, teeth, branch, rock, or surrounding plants.
GROUND CONTACT:
- All feet rest on Y=0; pivot below torso center; head faces positive Z.
OUTPUT:
Exactly ONE isolated Tropical Island Iguana 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-BAT-01 — Island fruit bat

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Island Fruit Bat 01
ASSET CATEGORY: Wildlife / Flying Mammal
DESCRIPTION:
Create exactly ONE tropical fruit bat in a neutral gliding pose for a riggable airborne model, with wings spread symmetrically and its head facing forward.
DIMENSIONS: Width (X) 0.95 m wingspan; Height (Y) 0.22 m; Depth (Z) 0.38 m.
GEOMETRY:
- Compact faceted torso, small fox-like head, two short ears, and two broad connected wings.
- Each wing uses 4–5 large membrane polygons supported by thick simplified finger structures.
- Short separated legs point gently backward; no gripping branch.
- Target reconstructed mesh: 600–1,100 triangles.
MATERIALS:
- Body and wing supports #454B50 and #65513F.
- Wing membranes muted brown #614632 with lighter #896445 facets; face accents #AD8962.
SPECIAL DETAILS:
- No fur strands, visible fangs, fruit, cave, moon, motion blur, or horror styling.
GROUND CONTACT:
- No ground contact. Pivot at torso center of mass; flight direction positive Z.
OUTPUT:
Exactly ONE isolated Island Fruit Bat 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-BIRD-01 — Tropical frigatebird

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Tropical Frigatebird 01
ASSET CATEGORY: Wildlife / Seabird
DESCRIPTION:
Create exactly ONE tropical frigatebird in a calm gliding pose with long angular wings and a deeply forked tail.
DIMENSIONS: Width (X) 1.8 m wingspan; Height (Y) 0.28 m; Depth (Z) 0.75 m beak to tail.
GEOMETRY:
- Slender connected body, long hooked beak, two broad angular wings with 4–5 large feather masses per wing, and one forked tail.
- Wings are sturdy faceted surfaces rather than individual feather cards.
- Feet remain small but connected and tucked beneath the body.
- Target reconstructed mesh: 500–950 triangles.
MATERIALS:
- Main body and wings #454B50 with #71777A upper facets.
- Beak muted stone gray #999D9B; optional small restrained dark red throat patch.
SPECIAL DETAILS:
- No sky, clouds, nest, fish, spread toes, feather microdetail, or motion blur.
GROUND CONTACT:
- No ground contact. Pivot at body center of mass; flight direction positive Z.
OUTPUT:
Exactly ONE isolated Tropical Frigatebird 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-TURTLE-01 — Green sea turtle

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Green Sea Turtle 01
ASSET CATEGORY: Wildlife / Marine Reptile
DESCRIPTION:
Create exactly ONE adult sea turtle in a calm neutral swimming pose with all four flippers clearly visible.
DIMENSIONS: Width (X) 1.0 m flipper span; Height (Y) 0.32 m; Depth (Z) 1.25 m nose to rear shell.
GEOMETRY:
- Broad faceted oval shell, connected head and neck, two long front flippers, and two shorter rear flippers.
- Shell pattern defined by 8–12 large polygon panels, not fine scutes.
- Closed beak-like mouth and simple inset eyes.
- Target reconstructed mesh: 700–1,300 triangles.
MATERIALS:
- Shell #345B3C, #4E7A47, and #65513F.
- Skin olive #778B4B with muted sand #D6BC85 underside facets.
SPECIAL DETAILS:
- No water, bubbles, coral, sand, barnacles, damage, or baby-like proportions.
GROUND CONTACT:
- No ground contact. Pivot at shell center; swimming direction positive Z.
OUTPUT:
Exactly ONE isolated Green Sea Turtle 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-STINGRAY-01 — Reef stingray

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Reef Stingray 01
ASSET CATEGORY: Wildlife / Marine Animal
DESCRIPTION:
Create exactly ONE reef stingray in a calm neutral swimming pose with its broad diamond-shaped body clearly visible from above.
DIMENSIONS: Width (X) 1.25 m; Height (Y) 0.20 m; Depth (Z) 1.8 m including tail.
GEOMETRY:
- One connected flattened diamond body with gently raised center, blunt snout, and broad wing-like side fins.
- One sturdy tapering tail, thick enough for reconstruction and later animation; no separate barb geometry.
- Target reconstructed mesh: 350–700 triangles.
MATERIALS:
- Upper body #71777A and muted olive-gray #68735D; lower edge #999D9B; eyes #454B50.
SPECIAL DETAILS:
- No spots, water, sand, coral, barb close-up, raised attack tail, or motion effects.
GROUND CONTACT:
- No ground contact. Pivot at body center; swimming direction positive Z.
OUTPUT:
Exactly ONE isolated Reef Stingray 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-FISH-01 — Tropical reef fish

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Tropical Reef Fish 01
ASSET CATEGORY: Wildlife / Marine Animal
DESCRIPTION:
Create exactly ONE medium tropical reef fish with a tall oval body and broad readable fins, suitable for reuse in small schools.
DIMENSIONS: Width (X) 0.10 m body thickness; Height (Y) 0.28 m; Depth (Z) 0.48 m nose to tail.
GEOMETRY:
- Faceted oval body, one connected dorsal fin, one lower fin, two sturdy side fins, and a broad forked tail.
- Closed mouth and simple inset eye shapes.
- Target reconstructed mesh: 180–350 triangles.
MATERIALS:
- Main body muted turquoise #438B9E and #48A9B1.
- Two broad vertical bands in #D6BC85 and #454B50; fins use restrained olive #778B4B.
SPECIAL DETAILS:
- Pattern uses large color regions only. No scales, water, bubbles, coral, school, or neon saturation.
GROUND CONTACT:
- No ground contact. Pivot at body center; swimming direction positive Z.
OUTPUT:
Exactly ONE isolated Tropical Reef Fish 01 matching the MASTER ASSET STYLE LOCK.
```

### FAUNA-FROG-01 — Tropical tree frog

```text
ASSET IDENTITY OVERRIDE
ASSET NAME: Tropical Tree Frog 01
ASSET CATEGORY: Wildlife / Amphibian
DESCRIPTION:
Create exactly ONE tropical tree frog in a neutral low crouch with all four limbs visible and separated for rigging.
DIMENSIONS: Width (X) 0.16 m; Height (Y) 0.10 m; Depth (Z) 0.22 m.
GEOMETRY:
- Compact faceted torso, broad wedge-shaped head, two large but natural inset eyes, two short front legs, and two folded powerful rear legs.
- Toes end in simplified broad pads; no thin individual digits.
- Target reconstructed mesh: 250–500 triangles.
MATERIALS:
- Main body #4E7A47 and #8AAB62; shadow facets #345B3C; underside muted #D6BC85.
SPECIAL DETAILS:
- No wet gloss, tongue, insect, leaf, branch, exaggerated smile, or toy-like eyes.
GROUND CONTACT:
- Belly and feet sit just above Y=0 with feet contacting the ground; pivot below torso center; head faces positive Z.
OUTPUT:
Exactly ONE isolated Tropical Tree Frog 01 matching the MASTER ASSET STYLE LOCK.
```

## Recommended next-wave assets

After the first style-consistency test, expand with these IDs using the same patterns:

| ID | Asset | Dimensions (m) | Tier | Gameplay or dressing role |
|---|---|---:|---|---|
| ENV-PALM-02 | coconut palm with 3 coconuts | 6 × 9 × 6 | L | coconut decision |
| ENV-BUSH-02 | purple berry bush | 1.8 × 1.2 × 1.6 | M | mystery-berries decision |
| ENV-ROCK-02 | small path rock | 0.7 × 0.45 × 0.6 | S | repetition dressing |
| ENV-ROCK-03 | cliff ledge module | 12 × 5 × 6 | L | mountain route |
| ENV-CAVE-01 | cave entrance facade | 10 × 6 × 5 | L | cave decision |
| ENV-POOL-01 | freshwater pool edge quarter | 10 × 0.8 × 8 | M | modular pool border |
| ENV-SHORE-01 | rocky shoreline module | 12 × 1.5 × 8 | M | coast breakup |
| ENV-TRAIL-01 | dirt trail straight module | 8 × 0.08 × 2.5 | S | route dressing |
| ENV-TRAIL-02 | dirt trail fork module | 8 × 0.08 × 8 | S | crossroads landmark |
| CRASH-SEAT-01 | detached aircraft seat | 0.55 × 0.9 × 0.65 | M | smoke-signal prop |
| CRASH-SLIDE-01 | folded emergency slide | 1.2 × 0.6 × 0.8 | M | rainwater decision |
| CRASH-LUGGAGE-01 | hard-shell suitcase | 0.45 × 0.7 × 0.25 | M | crash-site dressing |
| CRASH-CART-01 | airline snack cart | 0.35 × 1.05 × 0.8 | M | wreckage decision |
| CAMP-FIRE-01 | unlit campfire ring | 1.2 × 0.35 × 1.2 | M | camp state |
| CAMP-SHELTER-01 | palm-frond lean-to | 3.5 × 2.2 × 2.5 | L | shelter state |
| CAMP-CATCHER-01 | coconut catcher frame | 2.0 × 2.4 × 1.8 | M | coconut decision |
| CAMP-SIGNAL-01 | signal fire base | 1.4 × 0.5 × 1.4 | M | smoke decision |
| ITEM-COMPASS-01 | button compass | 0.07 × 0.02 × 0.07 | S | navigation item |
| ITEM-RADIO-01 | damaged handheld radio | 0.09 × 0.21 × 0.055 | M | rescue item |
| ITEM-MAP-01 | folded damaged map | 0.28 × 0.015 × 0.20 | S | cave outcome prop |
| ITEM-BOTTLE-01 | empty water bottle | 0.08 × 0.26 × 0.08 | S | rainwater decision |
| ITEM-FISHING-01 | simple fishing handline | 0.16 × 0.06 × 0.16 | S | food system |
| ITEM-HAMMER-01 | salvage hammer | 0.14 × 0.06 × 0.34 | M | repair tool |
| ITEM-PRYBAR-01 | short pry bar | 0.05 × 0.04 × 0.55 | M | wreck salvage |
| CRAFT-SHIELD-01 | aircraft-panel shield | 0.65 × 0.08 × 0.85 | M | defensive choice |
| CRAFT-RAIN-01 | leaf rain collector | 1.4 × 0.8 × 1.2 | M | water collection |
| FAUNA-GECKO-01 | tropical house gecko | 0.12 × 0.04 × 0.28 | S | camp ambient wildlife |
| FAUNA-HERMIT-01 | hermit crab | 0.20 × 0.14 × 0.24 | S | beach ambient wildlife |
| FAUNA-PARROT-01 | island parrot | 0.35 × 0.28 × 0.48 | M | jungle ambient wildlife |
| FAUNA-EEL-01 | moray eel | 0.18 × 0.20 × 1.25 | M | reef hazard |
| FAUNA-OCTOPUS-01 | reef octopus | 0.85 × 0.30 × 0.85 | M | tide-pool encounter |
| FAUNA-DOLPHIN-01 | tropical dolphin | 0.75 × 0.65 × 2.3 | L | rescue or ocean event |
| FAUNA-CHICKEN-01 | feral island chicken | 0.45 × 0.55 × 0.65 | M | food/comedy encounter |

## Generation order

1. Generate and approve one style anchor from each silhouette family: `ENV-PALM-01`, `ENV-ROCK-01`, `ITEM-KNIFE-01`, `VEH-WRECK-01`, and `VEH-RAFT-01`.
2. Use those five approved images as visual references for every later generation, while still prepending the full master prompt.
3. Generate the remaining current-project replacements.
4. Generate decision-card props before generic decorative items, because they will visibly react to choices.
5. Reconstruct and validate one asset from each tier before producing the whole catalog.

## GLB acceptance checklist

- Correct dimensions in meters and Y-up orientation.
- Environment pivot at ground contact; held-item pivot at grip.
- Applied transforms: scale 1,1,1 and clean rotation at export.
- One shared palette material where practical; matte, flat-shaded appearance.
- No hidden high-resolution normal/metallic maps.
- No disconnected accidental geometry or paper-thin pieces.
- Primitive or authored proxy collision is recorded separately from the render mesh.
- Stable semantic filename, for example `env_palm_01.glb` or `item_knife_01.glb`.
- GLB is pruned, deduplicated, Meshopt-compressed, and visually checked in the actual isometric camera.

